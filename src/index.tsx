import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'

type Bindings = {
  DB: MySQLDatabase;
  BUCKET: R2Bucket;
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
}

type MySQLDatabase = D1Database;

type Variables = {
  user: any;
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ==================== Helper Functions ====================

const LOCAL_CATEGORIES = [
  { id: 1, name: '사진', icon: '📷', color: '#3B82F6' },
  { id: 2, name: '동영상', icon: '🎥', color: '#8B5CF6' },
  { id: 3, name: '문서', icon: '📄', color: '#10B981' },
  { id: 4, name: 'SNS 게시물', icon: '💬', color: '#F59E0B' },
  { id: 5, name: '이메일', icon: '📧', color: '#EF4444' },
  { id: 6, name: '음성/통화', icon: '🎙️', color: '#EC4899' },
  { id: 7, name: '기타', icon: '📦', color: '#6B7280' }
]

type LocalUser = {
  id: number;
  email: string;
  password: string;
  name: string;
  avatar_url: string;
}

type LocalSession = {
  id: string;
  user_id: number;
  expires_at: string;
}

type LocalMemory = {
  id: number;
  user_id: number;
  category_id?: number | null;
  title: string;
  description?: string | null;
  content?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  tags?: string | null;
  ai_summary?: string | null;
  ai_sentiment?: string | null;
  ai_keywords?: string | null;
  importance_score?: number;
  original_date?: string | null;
  created_at: string;
  updated_at: string;
}

const localDbState: {
  users: LocalUser[];
  sessions: LocalSession[];
  memories: LocalMemory[];
  nextUserId: number;
  nextMemoryId: number;
} = {
  users: [],
  sessions: [],
  memories: [],
  nextUserId: 1,
  nextMemoryId: 1
}

function withCategory(memory: LocalMemory) {
  const category = LOCAL_CATEGORIES.find((item) => item.id === Number(memory.category_id))
  return {
    ...memory,
    category_name: category?.name || '미분류',
    category_icon: category?.icon || '📦',
    category_color: category?.color || '#6B7280'
  }
}

function createLocalResult(sql: string, params: any[]) {
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase()

  if (normalizedSql.startsWith('select id from users where email')) {
    return localDbState.users.find((user) => user.email === params[0]) || null
  }

  if (normalizedSql.startsWith('select id, email, name, avatar_url, password from users')) {
    return localDbState.users.find((user) => user.email === params[0] && user.password === params[1]) || null
  }

  if (normalizedSql.includes('from sessions s join users u')) {
    const session = localDbState.sessions.find((item) => item.id === params[0] && new Date(item.expires_at) > new Date())
    const user = session ? localDbState.users.find((item) => item.id === session.user_id) : null
    return session && user ? { ...session, email: user.email, name: user.name, avatar_url: user.avatar_url } : null
  }

  if (normalizedSql.startsWith('select * from categories')) {
    return [...LOCAL_CATEGORIES].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }

  if (normalizedSql.startsWith('select count(*) as total from memories')) {
    const userId = Number(params[0])
    return { total: localDbState.memories.filter((memory) => memory.user_id === userId).length }
  }

  if (normalizedSql.startsWith('select count(*) as count from memories')) {
    const userId = Number(params[0])
    return { count: localDbState.memories.filter((memory) => memory.user_id === userId).length }
  }

  if (normalizedSql.includes('from categories c left join memories m')) {
    const userId = Number(params[0])
    return LOCAL_CATEGORIES.map((category) => ({
      ...category,
      count: localDbState.memories.filter((memory) => memory.user_id === userId && Number(memory.category_id) === category.id).length
    })).sort((a, b) => b.count - a.count)
  }

  if (normalizedSql.includes('select ai_sentiment, count(*) as count')) {
    const userId = Number(params[0])
    const counts = new Map<string, number>()
    localDbState.memories
      .filter((memory) => memory.user_id === userId && memory.ai_sentiment)
      .forEach((memory) => counts.set(String(memory.ai_sentiment), (counts.get(String(memory.ai_sentiment)) || 0) + 1))
    return Array.from(counts.entries()).map(([ai_sentiment, count]) => ({ ai_sentiment, count }))
  }

  if (normalizedSql.startsWith('select m.*, c.name as category_name')) {
    const numericParams = params.map((value) => Number(value))
    const userId = numericParams.find((value) => Number.isFinite(value) && localDbState.users.some((user) => user.id === value))
    const id = normalizedSql.includes('where m.id = ?') ? Number(params[0]) : null
    let memories = localDbState.memories.filter((memory) => !userId || memory.user_id === userId)
    if (id) memories = memories.filter((memory) => memory.id === id)
    if (normalizedSql.includes('order by m.created_at desc')) {
      memories = memories.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return memories.map(withCategory)
  }

  if (normalizedSql.startsWith('select * from memories where id')) {
    return localDbState.memories.find((memory) => memory.id === Number(params[0])) || null
  }

  if (normalizedSql.startsWith('select user_id from memories where id')) {
    const memory = localDbState.memories.find((item) => item.id === Number(params[0]))
    return memory ? { user_id: memory.user_id } : null
  }

  if (normalizedSql.startsWith('select * from memories where user_id')) {
    const userId = Number(params[0])
    return localDbState.memories
      .filter((memory) => memory.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  if (normalizedSql.includes('from connections')) {
    return []
  }

  return null
}

function createLocalDatabase(): D1Database {
  return {
    prepare(sql: string) {
      let params: any[] = []

      return {
        bind(...values: any[]) {
          params = values
          return this
        },
        async first() {
          const result = createLocalResult(sql, params)
          return Array.isArray(result) ? (result[0] || null) : result
        },
        async all() {
          const result = createLocalResult(sql, params)
          return { results: Array.isArray(result) ? result : result ? [result] : [] }
        },
        async run() {
          const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase()

          if (normalizedSql.startsWith('insert into users')) {
            const id = localDbState.nextUserId++
            localDbState.users.push({
              id,
              email: params[0],
              password: params[1],
              name: params[2],
              avatar_url: params[3]
            })
            return { meta: { last_row_id: id } }
          }

          if (normalizedSql.startsWith('insert into sessions')) {
            localDbState.sessions = localDbState.sessions.filter((session) => session.id !== params[0])
            localDbState.sessions.push({ id: params[0], user_id: Number(params[1]), expires_at: params[2] })
            return { meta: { last_row_id: 0 } }
          }

          if (normalizedSql.startsWith('delete from sessions')) {
            localDbState.sessions = localDbState.sessions.filter((session) => session.id !== params[0])
            return { meta: { last_row_id: 0 } }
          }

          if (normalizedSql.startsWith('insert into memories')) {
            const id = localDbState.nextMemoryId++
            const now = new Date().toISOString()
            localDbState.memories.unshift({
              id,
              user_id: Number(params[0]),
              category_id: params[1] ? Number(params[1]) : null,
              title: params[2],
              description: params[3],
              content: params[4],
              file_url: params[5],
              file_type: params[6],
              tags: params[7],
              ai_summary: params[8],
              ai_sentiment: params[9],
              ai_keywords: params[10],
              importance_score: Number(params[11]) || 5,
              original_date: params[12],
              created_at: now,
              updated_at: now
            })
            return { meta: { last_row_id: id } }
          }

          if (normalizedSql.startsWith('delete from memories')) {
            localDbState.memories = localDbState.memories.filter((memory) => memory.id !== Number(params[0]))
            return { meta: { last_row_id: 0 } }
          }

          return { meta: { last_row_id: 0 } }
        }
      }
    },
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 })
  } as unknown as D1Database
}

async function getDatabase(env?: Partial<Bindings>): Promise<MySQLDatabase> {
  return (env?.DB || createLocalDatabase()) as MySQLDatabase
}

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Generate session ID
function generateSessionId(): string {
  return crypto.randomUUID()
}

// Session expiry (7 days)
function getExpiryDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString()
}

// Auth middleware
async function authMiddleware(c: any, next: any) {
  const sessionId = getCookie(c, 'session_id')
  
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const DB = await getDatabase(c.env)
  const session = await DB.prepare(`
    SELECT s.*, u.id, u.email, u.name, u.avatar_url 
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).bind(sessionId).first()

  if (!session) {
    deleteCookie(c, 'session_id')
    return c.json({ error: 'Session expired' }, 401)
  }

  c.set('user', {
    id: session.user_id,
    email: session.email,
    name: session.name,
    avatar_url: session.avatar_url
  })

  await next()
}

// AI Analysis with OpenAI Responses API, image input, and local fallback
type MemoryAnalysis = {
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  keywords: string[];
  confidence: number;
  recommended_tags: string[];
  memory_meaning: string;
  scene_type: string;
  atmosphere: string;
  felt_emotion: string;
  image_observations: string;
}

type MemoryAnalysisContext = {
  imageUrl?: string | null;
  fileType?: string | null;
}

const memoryAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'sentiment',
    'keywords',
    'confidence',
    'recommended_tags',
    'memory_meaning',
    'scene_type',
    'atmosphere',
    'felt_emotion',
    'image_observations'
  ],
  properties: {
    summary: {
      type: 'string',
      description: '추억의 핵심 내용을 한국어 한 문장으로 요약'
    },
    sentiment: {
      type: 'string',
      enum: ['positive', 'negative', 'neutral'],
      description: '추억에서 느껴지는 대표 감정'
    },
    keywords: {
      type: 'array',
      minItems: 3,
      maxItems: 7,
      items: { type: 'string' },
      description: '검색과 분류에 쓸 한국어 핵심 키워드'
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: '분석 신뢰도'
    },
    recommended_tags: {
      type: 'array',
      minItems: 2,
      maxItems: 5,
      items: { type: 'string' },
      description: '사용자에게 추천할 태그'
    },
    memory_meaning: {
      type: 'string',
      description: '이 추억이 사용자에게 어떤 의미인지 짧게 설명'
    },
    scene_type: {
      type: 'string',
      description: '사진/설명에서 판별한 장면 유형. 예: 가족 여행, 일상 기록, 학교 생활, 문서 기록'
    },
    atmosphere: {
      type: 'string',
      description: '장면의 전체 분위기. 예: 따뜻함, 차분함, 활기참, 그리움'
    },
    felt_emotion: {
      type: 'string',
      description: '사용자가 느꼈을 법한 핵심 감정을 구체적으로 분류. 예: 편안함, 설렘, 행복, 사랑, 그리움, 기분 나쁨, 불쾌함, 화남, 실망, 걱정, 두려움'
    },
    image_observations: {
      type: 'string',
      description: '이미지가 있으면 보이는 요소를 근거 중심으로 설명하고, 이미지가 없으면 설명문 기준으로 추정'
    }
  }
}

function uniqueList(values: string[], max = 7): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values) {
    const value = raw.replace(/[.,!?()[\]{}"']/g, '').trim()
    if (!value || value.length < 2 || seen.has(value)) continue
    seen.add(value)
    result.push(value)
    if (result.length >= max) break
  }

  return result
}

function createLocalMemoryAnalysis(text: string, context: MemoryAnalysisContext = {}): MemoryAnalysis {
  const cleanText = text.replace(/\s+/g, ' ').trim()
  const lowerText = cleanText.toLowerCase()
  const positiveWords = ['행복', '기쁨', '사랑', '즐거', '감사', '소중', '웃음', '좋', '최고', '따뜻', '설렘']
  const negativeWords = ['슬픔', '아픔', '힘들', '그립', '외로', '걱정', '후회', '눈물', '상실', '미안', '기분 나쁘', '기분이 나빴', '불쾌', '불편', '속상', '짜증', '화남', '화가', '분노', '실망', '싫', '무서', '두려']
  const positiveScore = positiveWords.filter((word) => lowerText.includes(word)).length
  const negativeScore = negativeWords.filter((word) => lowerText.includes(word)).length
  const sentiment: MemoryAnalysis['sentiment'] =
    positiveScore > negativeScore ? 'positive' : negativeScore > positiveScore ? 'negative' : 'neutral'
  const words = uniqueList(cleanText.split(/[^\p{L}\p{N}_]+/u), 7)
  const keywords = words.length >= 3 ? words : uniqueList([...words, '추억', '기록', '보관'], 7)
  const firstSentence = cleanText.split(/[.!?。！？]/)[0] || cleanText
  const summary = firstSentence.length > 90 ? `${firstSentence.slice(0, 90)}...` : firstSentence || '추억의 내용을 분석했습니다.'
  const hasImage = Boolean(context.imageUrl || context.fileType?.startsWith('image'))
  const sceneType =
    lowerText.includes('여행') ? '여행과 함께한 추억' :
    lowerText.includes('가족') ? '가족과 함께한 순간' :
    lowerText.includes('학교') || lowerText.includes('대학교') ? '학교 생활 기록' :
    lowerText.includes('편지') || lowerText.includes('문서') ? '문서로 남긴 기록' :
    hasImage ? '사진으로 남긴 일상 장면' : '개인 추억 기록'
  const atmosphere =
    sentiment === 'positive' ? '따뜻하고 밝은 분위기' :
    sentiment === 'negative' ? '차분하고 그리움이 느껴지는 분위기' :
    hasImage ? '잔잔하고 자연스러운 분위기' : '담백하게 정리된 분위기'
  const feltEmotion =
    lowerText.includes('기분 나쁘') || lowerText.includes('기분이 나빴') || lowerText.includes('불쾌') || lowerText.includes('싫') ? '기분 나쁨과 불쾌함' :
    lowerText.includes('불편') || lowerText.includes('속상') ? '불편함과 속상함' :
    lowerText.includes('짜증') || lowerText.includes('화남') || lowerText.includes('화가') || lowerText.includes('분노') ? '화남과 답답함' :
    lowerText.includes('실망') || lowerText.includes('후회') ? '실망과 아쉬움' :
    lowerText.includes('무서') || lowerText.includes('두려') || lowerText.includes('걱정') ? '걱정과 두려움' :
    lowerText.includes('설렘') ? '기분 좋은 설렘' :
    lowerText.includes('편안') || lowerText.includes('차분') ? '편안함과 차분함' :
    sentiment === 'positive' ? '소중함과 기분 좋은 설렘' :
    sentiment === 'negative' ? '그리움과 아쉬움' : '편안함과 차분함'

  return {
    summary,
    sentiment,
    keywords,
    confidence: hasImage ? 0.62 : 0.55,
    recommended_tags: uniqueList([...keywords.slice(0, 4), atmosphere, feltEmotion], 5),
    memory_meaning: '이 기록은 당시의 상황과 감정을 다시 떠올릴 수 있게 해 주는 개인적인 추억 자료입니다.',
    scene_type: sceneType,
    atmosphere,
    felt_emotion: feltEmotion,
    image_observations: hasImage
      ? '이미지와 사용자가 입력한 설명을 함께 기준으로 장면과 분위기를 추정했습니다.'
      : '이미지는 없지만 제목과 설명문을 기준으로 장면과 감정을 추정했습니다.'
  }
}

function normalizeAnalysis(value: any, originalText: string, context: MemoryAnalysisContext = {}): MemoryAnalysis {
  const fallback = createLocalMemoryAnalysis(originalText, context)
  const sentiment = ['positive', 'negative', 'neutral'].includes(value?.sentiment)
    ? value.sentiment
    : fallback.sentiment
  const keywords = uniqueList(
    Array.isArray(value?.keywords) ? value.keywords.map(String) : fallback.keywords,
    7
  )
  const recommendedTags = uniqueList(
    Array.isArray(value?.recommended_tags) ? value.recommended_tags.map(String) : keywords,
    5
  )
  const confidence = Number(value?.confidence)

  return {
    summary: String(value?.summary || fallback.summary).slice(0, 180),
    sentiment,
    keywords: keywords.length ? keywords : fallback.keywords,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : fallback.confidence,
    recommended_tags: recommendedTags.length ? recommendedTags : fallback.recommended_tags,
    memory_meaning: String(value?.memory_meaning || fallback.memory_meaning).slice(0, 180),
    scene_type: String(value?.scene_type || fallback.scene_type).slice(0, 120),
    atmosphere: String(value?.atmosphere || fallback.atmosphere).slice(0, 120),
    felt_emotion: String(value?.felt_emotion || fallback.felt_emotion).slice(0, 120),
    image_observations: String(value?.image_observations || fallback.image_observations).slice(0, 220)
  }
}

function extractResponseText(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text

  const parts: string[] = []
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') parts.push(content.text)
    }
  }

  return parts.join('\n')
}

function getOpenAIImageUrl(context: MemoryAnalysisContext): string | null {
  const imageUrl = context.imageUrl?.trim()
  if (!imageUrl || !context.fileType?.startsWith('image')) return null
  if (imageUrl.startsWith('data:image/')) return imageUrl
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  return null
}

async function analyzeWithAI(
  text: string,
  apiKey?: string,
  model = 'gpt-5.2',
  context: MemoryAnalysisContext = {}
): Promise<MemoryAnalysis> {
  const imageUrl = getOpenAIImageUrl(context)

  if (!apiKey?.trim()) {
    return createLocalMemoryAnalysis(text, context)
  }

  try {
    const content: any[] = [
      {
        type: 'input_text',
        text: [
          '다음 추억 기록을 분석해 주세요.',
          '이미지가 있으면 이미지의 구도, 보이는 대상, 색감, 표정/분위기를 근거로 장면을 판별해 주세요.',
          '이미지나 설명만으로 확정할 수 없는 내용은 단정하지 말고 추정이라고 표현해 주세요.',
          '',
          text
        ].join('\n')
      }
    ]

    if (imageUrl) {
      content.push({
        type: 'input_image',
        image_url: imageUrl
      })
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        instructions: [
          '당신은 AI 기반 추억 관리 서비스의 분석 엔진입니다.',
          '사용자가 저장한 이미지, 사진 설명, 문서 내용, SNS 기록을 한국어로 분석합니다.',
          '장면 판별, 전체 분위기, 사용자가 느꼈을 법한 기분, 추억의 의미를 근거 중심으로 정리합니다.',
          '고인이나 가족 관계를 단정하지 말고, 입력에 드러난 정보만 근거로 차분하게 표현합니다.',
          '개인정보, 비밀번호, 연락처 같은 민감정보는 키워드로 뽑지 않습니다.'
        ].join('\n'),
        input: [
          {
            role: 'user',
            content
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'memory_analysis',
            strict: true,
            schema: memoryAnalysisSchema
          }
        },
        max_output_tokens: 900
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI Responses API failed: ${response.status}`)
    }

    const data = await response.json()
    const outputText = extractResponseText(data)
    const parsed = JSON.parse(outputText)
    return normalizeAnalysis(parsed, text, context)
  } catch (error) {
    console.error('AI analysis fallback:', error)
    return createLocalMemoryAnalysis(text, context)
  }
}

// ==================== Auth Routes ====================

// Enable CORS for all routes
app.use('*', cors({
  origin: '*',
  credentials: true
}))

// Register
app.post('/api/auth/register', async (c) => {
  const DB = await getDatabase(c.env)
  const { email, password, name } = await c.req.json()

  if (!email || !password || !name) {
    return c.json({ error: '모든 필드를 입력해주세요' }, 400)
  }

  // Check if user exists
  const existingUser = await DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first()

  if (existingUser) {
    return c.json({ error: '이미 존재하는 이메일입니다' }, 400)
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  // Create user
  const result = await DB.prepare(`
    INSERT INTO users (email, password, name, avatar_url)
    VALUES (?, ?, ?, ?)
  `).bind(email, hashedPassword, name, `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`).run()

  const userId = result.meta.last_row_id

  // Create session
  const sessionId = generateSessionId()
  const expiresAt = getExpiryDate()

  await DB.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(sessionId, userId, expiresAt).run()

  // Set cookie
  setCookie(c, 'session_id', sessionId, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  })

  return c.json({
    success: true,
    user: {
      id: userId,
      email,
      name,
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`
    }
  })
})

// Login
app.post('/api/auth/login', async (c) => {
  const DB = await getDatabase(c.env)
  const { email, password } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: '이메일과 비밀번호를 입력해주세요' }, 400)
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  // Find user
  const user = await DB.prepare(`
    SELECT id, email, name, avatar_url, password
    FROM users
    WHERE email = ? AND password = ?
  `).bind(email, hashedPassword).first()

  if (!user) {
    return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401)
  }

  // Create session
  const sessionId = generateSessionId()
  const expiresAt = getExpiryDate()

  await DB.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(sessionId, user.id, expiresAt).run()

  // Set cookie
  setCookie(c, 'session_id', sessionId, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/'
  })

  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url
    }
  })
})

// Logout
app.post('/api/auth/logout', async (c) => {
  const DB = await getDatabase(c.env)
  const sessionId = getCookie(c, 'session_id')

  if (sessionId) {
    await DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
  }

  deleteCookie(c, 'session_id')
  return c.json({ success: true })
})

// Get current user
app.get('/api/auth/me', authMiddleware, async (c) => {
  const user = c.get('user')
  return c.json({ user })
})

// ==================== Protected API Routes ====================

// Get all categories (public)
app.get('/api/categories', async (c) => {
  const DB = await getDatabase(c.env)
  const result = await DB.prepare('SELECT * FROM categories ORDER BY name').all()
  return c.json(result.results)
})

// Get all memories with pagination (protected)
app.get('/api/memories', authMiddleware, async (c) => {
  const DB = await getDatabase(c.env)
  const user = c.get('user')
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const category = c.req.query('category')
  const search = c.req.query('search')
  const offset = (page - 1) * limit

  let query = `
    SELECT m.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM memories m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.user_id = ?
  `
  const params: any[] = [user.id]

  if (category) {
    query += ' AND m.category_id = ?'
    params.push(parseInt(category))
  }

  if (search) {
    query += ' AND (m.title LIKE ? OR m.description LIKE ? OR m.content LIKE ?)'
    const searchTerm = `%${search}%`
    params.push(searchTerm, searchTerm, searchTerm)
  }

  query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const result = await DB.prepare(query).bind(...params).all()
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM memories WHERE user_id = ?'
  const countParams: any[] = [user.id]
  if (category) {
    countQuery += ' AND category_id = ?'
    countParams.push(parseInt(category))
  }
  if (search) {
    countQuery += ' AND (title LIKE ? OR description LIKE ? OR content LIKE ?)'
    const searchTerm = `%${search}%`
    countParams.push(searchTerm, searchTerm, searchTerm)
  }
  const countResult = await DB.prepare(countQuery).bind(...countParams).first()

  return c.json({
    data: result.results,
    pagination: {
      page,
      limit,
      total: countResult?.total || 0,
      totalPages: Math.ceil((countResult?.total || 0) / limit)
    }
  })
})

// Get single memory by ID (protected)
app.get('/api/memories/:id', authMiddleware, async (c) => {
  const DB = await getDatabase(c.env)
  const user = c.get('user')
  const id = c.req.param('id')
  
  const memory = await DB.prepare(`
    SELECT m.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM memories m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.id = ? AND m.user_id = ?
  `).bind(id, user.id).first()

  if (!memory) {
    return c.json({ error: 'Memory not found' }, 404)
  }

  // Get connected memories
  const connections = await DB.prepare(`
    SELECT m.*, conn.connection_type, conn.strength
    FROM connections conn
    JOIN memories m ON (conn.memory_id_2 = m.id OR conn.memory_id_1 = m.id)
    WHERE (conn.memory_id_1 = ? OR conn.memory_id_2 = ?) AND m.id != ? AND m.user_id = ?
  `).bind(id, id, id, user.id).all()

  return c.json({
    ...memory,
    connections: connections.results
  })
})

// Upload file to R2 (protected)
app.post('/api/upload', authMiddleware, async (c) => {
  const { BUCKET } = c.env
  
  if (!BUCKET) {
    return c.json({ error: 'R2 버킷이 설정되지 않았습니다. 로컬에서는 파일 URL을 직접 입력해주세요.' }, 400)
  }

  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()
    const key = `uploads/${timestamp}-${randomStr}.${extension}`

    const arrayBuffer = await file.arrayBuffer()
    await BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    const fileUrl = `/api/files/${key}`

    return c.json({
      success: true,
      url: fileUrl,
      key: key,
      name: file.name,
      type: file.type,
      size: file.size
    })
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'Upload failed' }, 500)
  }
})

// Get file from R2
app.get('/api/files/*', async (c) => {
  const { BUCKET } = c.env
  
  if (!BUCKET) {
    return c.text('R2 버킷이 설정되지 않았습니다', 404)
  }

  const key = c.req.path.replace('/api/files/', '')
  
  try {
    const object = await BUCKET.get(key)
    
    if (!object) {
      return c.text('File not found', 404)
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error) {
    console.error('File retrieval error:', error)
    return c.text('Error retrieving file', 500)
  }
})

// Create new memory with AI analysis (protected)
app.post('/api/memories', authMiddleware, async (c) => {
  const DB = await getDatabase(c.env)
  const { OPENAI_API_KEY, OPENAI_MODEL } = c.env
  const user = c.get('user')
  const body = await c.req.json()
  
  const { 
    category_id, 
    title, 
    description, 
    content,
    file_url,
    file_type,
    tags,
    importance_score = 5,
    original_date,
    auto_analyze = true
  } = body

  if (!title) {
    return c.json({ error: 'Title is required' }, 400)
  }

  let ai_summary = null
  let ai_sentiment = null
  let ai_keywords = null

  if (auto_analyze && (description || content)) {
    const textToAnalyze = `${title}. ${description || ''}. ${content || ''}`
    const analysis = await analyzeWithAI(textToAnalyze, OPENAI_API_KEY, OPENAI_MODEL || 'gpt-5.2')
    ai_summary = analysis.summary
    ai_sentiment = analysis.sentiment
    ai_keywords = JSON.stringify(uniqueList([...analysis.keywords, ...analysis.recommended_tags], 8))
  }

  const result = await DB.prepare(`
    INSERT INTO memories (
      user_id, category_id, title, description, content,
      file_url, file_type, tags, ai_summary, ai_sentiment, ai_keywords,
      importance_score, original_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user.id,
    category_id || null,
    title,
    description || null,
    content || null,
    file_url || null,
    file_type || null,
    tags ? JSON.stringify(tags) : null,
    ai_summary,
    ai_sentiment,
    ai_keywords,
    importance_score,
    original_date || null
  ).run()

  const newMemory = await DB.prepare('SELECT * FROM memories WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return c.json(newMemory, 201)
})

// Update memory (protected)
app.put('/api/memories/:id', authMiddleware, async (c) => {
  const DB = await getDatabase(c.env)
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json()

  // Check ownership
  const existing = await DB.prepare('SELECT user_id FROM memories WHERE id = ?').bind(id).first()
  if (!existing || existing.user_id !== user.id) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const { 
    category_id, 
    title, 
    description, 
    content,
    file_url,
    file_type,
    tags,
    ai_summary,
    ai_sentiment,
    ai_keywords,
    importance_score,
    is_archived,
    original_date
  } = body

  const updates: string[] = []
  const params: any[] = []

  if (category_id !== undefined) {
    updates.push('category_id = ?')
    params.push(category_id)
  }
  if (title !== undefined) {
    updates.push('title = ?')
    params.push(title)
  }
  if (description !== undefined) {
    updates.push('description = ?')
    params.push(description)
  }
  if (content !== undefined) {
    updates.push('content = ?')
    params.push(content)
  }
  if (file_url !== undefined) {
    updates.push('file_url = ?')
    params.push(file_url)
  }
  if (file_type !== undefined) {
    updates.push('file_type = ?')
    params.push(file_type)
  }
  if (tags !== undefined) {
    updates.push('tags = ?')
    params.push(JSON.stringify(tags))
  }
  if (ai_summary !== undefined) {
    updates.push('ai_summary = ?')
    params.push(ai_summary)
  }
  if (ai_sentiment !== undefined) {
    updates.push('ai_sentiment = ?')
    params.push(ai_sentiment)
  }
  if (ai_keywords !== undefined) {
    updates.push('ai_keywords = ?')
    params.push(JSON.stringify(ai_keywords))
  }
  if (importance_score !== undefined) {
    updates.push('importance_score = ?')
    params.push(importance_score)
  }
  if (is_archived !== undefined) {
    updates.push('is_archived = ?')
    params.push(is_archived ? 1 : 0)
  }
  if (original_date !== undefined) {
    updates.push('original_date = ?')
    params.push(original_date)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)

  if (updates.length === 1) {
    return c.json({ error: 'No fields to update' }, 400)
  }

  await DB.prepare(`
    UPDATE memories 
    SET ${updates.join(', ')}
    WHERE id = ?
  `).bind(...params).run()

  const updatedMemory = await DB.prepare('SELECT * FROM memories WHERE id = ?')
    .bind(id)
    .first()

  return c.json(updatedMemory)
})

// Delete memory (protected)
app.delete('/api/memories/:id', authMiddleware, async (c) => {
  const DB = await getDatabase(c.env)
  const user = c.get('user')
  const id = c.req.param('id')

  // Check ownership
  const existing = await DB.prepare('SELECT user_id FROM memories WHERE id = ?').bind(id).first()
  if (!existing || existing.user_id !== user.id) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  await DB.prepare('DELETE FROM memories WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// Get statistics (protected)
app.get('/api/statistics', authMiddleware, async (c) => {
  const DB = await getDatabase(c.env)
  const user = c.get('user')

  const totalMemories = await DB.prepare('SELECT COUNT(*) as count FROM memories WHERE user_id = ?')
    .bind(user.id)
    .first()
    
  const categoriesCount = await DB.prepare(`
    SELECT c.name, c.icon, c.color, COUNT(m.id) as count
    FROM categories c
    LEFT JOIN memories m ON c.id = m.category_id AND m.user_id = ?
    GROUP BY c.id, c.name, c.icon, c.color
    ORDER BY count DESC
  `).bind(user.id).all()
  
  const recentMemories = await DB.prepare(`
    SELECT m.*, c.name as category_name, c.icon as category_icon
    FROM memories m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.user_id = ?
    ORDER BY m.created_at DESC
    LIMIT 5
  `).bind(user.id).all()

  const sentimentStats = await DB.prepare(`
    SELECT ai_sentiment, COUNT(*) as count
    FROM memories
    WHERE ai_sentiment IS NOT NULL AND user_id = ?
    GROUP BY ai_sentiment
  `).bind(user.id).all()

  const importanceStats = await DB.prepare(`
    SELECT importance_score as score, COUNT(*) as count
    FROM memories
    WHERE user_id = ?
    GROUP BY importance_score
    ORDER BY importance_score ASC
  `).bind(user.id).all()

  return c.json({
    total: totalMemories?.count || 0,
    byCategory: categoriesCount.results,
    recent: recentMemories.results,
    sentiments: sentimentStats.results,
    importance: importanceStats.results
  })
})

// Create connection between memories (protected)
app.post('/api/connections', authMiddleware, async (c) => {
  const DB = await getDatabase(c.env)
  const user = c.get('user')
  const { memory_id_1, memory_id_2, connection_type = 'related', strength = 5 } = await c.req.json()

  if (!memory_id_1 || !memory_id_2) {
    return c.json({ error: 'Both memory IDs are required' }, 400)
  }

  // Verify ownership
  const mem1 = await DB.prepare('SELECT user_id FROM memories WHERE id = ?').bind(memory_id_1).first()
  const mem2 = await DB.prepare('SELECT user_id FROM memories WHERE id = ?').bind(memory_id_2).first()
  
  if (!mem1 || !mem2 || mem1.user_id !== user.id || mem2.user_id !== user.id) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const result = await DB.prepare(`
    INSERT OR IGNORE INTO connections (memory_id_1, memory_id_2, connection_type, strength)
    VALUES (?, ?, ?, ?)
  `).bind(memory_id_1, memory_id_2, connection_type, strength).run()

  return c.json({ success: true, id: result.meta.last_row_id }, 201)
})

// Export data as JSON (protected)
app.get('/api/export', authMiddleware, async (c) => {
  const DB = await getDatabase(c.env)
  const user = c.get('user')
  
  const memories = await DB.prepare('SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC')
    .bind(user.id)
    .all()
    
  const categories = await DB.prepare('SELECT * FROM categories').all()
  
  const connections = await DB.prepare(`
    SELECT c.* FROM connections c
    JOIN memories m1 ON c.memory_id_1 = m1.id
    JOIN memories m2 ON c.memory_id_2 = m2.id
    WHERE m1.user_id = ? AND m2.user_id = ?
  `).bind(user.id, user.id).all()
  
  const exportData = {
    version: '2.0',
    exported_at: new Date().toISOString(),
    user: {
      email: user.email,
      name: user.name
    },
    data: {
      memories: memories.results,
      categories: categories.results,
      connections: connections.results
    }
  }
  
  return c.json(exportData)
})

// ==================== Frontend ====================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="theme-color" content="#1b1a17">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="MemoryLink">
        <link rel="manifest" href="/manifest.webmanifest">
        <link rel="icon" href="/static/app-icon.svg" type="image/svg+xml">
        <title>AI 기반 디지털 유품 정리 서비스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            margin: 0;
          }
          button, input {
            font: inherit;
          }
          .memory-card {
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          .memory-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
          .memory-card img {
            width: 100%;
            height: 200px;
            object-fit: cover;
          }
          .category-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
          }
          .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .upload-area {
            border: 2px dashed #cbd5e0;
            transition: all 0.3s;
          }
          .upload-area:hover, .upload-area.dragover {
            border-color: #667eea;
            background-color: #f7fafc;
          }
          .timeline-item {
            position: relative;
            padding-left: 2rem;
          }
          .timeline-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, #667eea, #764ba2);
          }
          .timeline-dot {
            position: absolute;
            left: -6px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #667eea;
            border: 3px solid white;
          }
          .modal {
            backdrop-filter: blur(4px);
          }
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .auth-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background: #ffffff;
          }
          .auth-shell {
            width: min(980px, calc(100vw - 3rem));
            margin: 0 auto;
          }
          .auth-column-title {
            display: none;
          }
          .auth-screen {
            width: 100%;
            height: min(720px, calc(100vh - 3rem));
            min-height: 640px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 26px 70px rgba(79, 70, 229, 0.16);
            box-sizing: border-box;
          }
          .auth-form-panel {
            width: 360px;
            min-height: 620px;
            padding: 2.75rem 2rem 1.75rem;
            border-radius: 0.7rem;
            background: #ffffff;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            box-sizing: border-box;
            overflow: hidden;
          }
          .auth-brand-block {
            height: 132px;
            flex: 0 0 132px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            text-align: center;
          }
          .auth-form-title {
            height: 34px;
            flex: 0 0 34px;
            display: flex;
            align-items: center;
            margin: 0 0 1rem;
          }
          .auth-form-body {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .auth-form-body > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0 !important;
          }
          .auth-bottom-link {
            min-height: 32px;
            flex: 0 0 auto;
            margin-top: 1rem !important;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
            z-index: 1;
          }
          .auth-form-body .auth-primary-button {
            margin-top: auto;
          }
          .auth-login-spacer {
            height: 4rem;
            flex: 0 0 4rem;
          }
          .auth-input {
            width: 100%;
            height: 2.85rem;
            border-radius: 0.45rem;
            border: 1px solid #d8e0ec;
            background: #ffffff;
            padding: 0.7rem 0.85rem;
            font-size: 0.9rem;
            transition: all 0.2s ease;
          }
          .auth-input:focus {
            outline: none;
            border-color: #8b5cf6;
            background: #ffffff;
            box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
          }
          .auth-primary-button {
            width: 100%;
            border: 0;
            border-radius: 0.45rem;
            padding: 0.9rem 1rem;
            color: #ffffff;
            font-weight: 800;
            cursor: pointer;
            background: linear-gradient(135deg, #7c3aed, #6d28d9);
            box-shadow: 0 10px 24px rgba(124, 58, 237, 0.26);
            transition: all 0.2s ease;
          }
          .auth-primary-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 16px 32px rgba(124, 58, 237, 0.36);
          }
          @media (max-width: 860px) {
            .auth-container {
              padding: 1.5rem;
            }
            .auth-shell {
              max-width: 100%;
            }
            .auth-screen {
              height: calc(100vh - 3rem);
              min-height: 620px;
              padding: 1.25rem;
            }
            .auth-form-panel {
              width: min(360px, 100%);
              min-height: 620px;
            }
          }
          .hidden { display: none !important; }
          
          /* Floating Action Button - Enhanced */
          .fab-button {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 999;
            border: none;
          }
          .fab-button:hover {
            transform: scale(1.1) rotate(90deg);
            box-shadow: 0 12px 32px rgba(102, 126, 234, 0.6);
          }
          .fab-button:active {
            transform: scale(0.95) rotate(90deg);
          }
          .fab-button i {
            color: white;
            font-size: 24px;
            transition: transform 0.3s;
          }
          
          /* FAB Sub-menu */
          .fab-menu {
            position: fixed;
            bottom: 7rem;
            right: 2rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            z-index: 998;
          }
          .fab-menu-item {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 0.75rem;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
          }
          .fab-menu-item.show {
            opacity: 1;
            transform: translateY(0);
            pointer-events: all;
          }
          .fab-menu-button {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: white;
            border: 2px solid #667eea;
            color: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .fab-menu-button:hover {
            transform: scale(1.1);
            background: #667eea;
            color: white;
          }
          .fab-menu-button i {
            font-size: 18px;
          }
          .fab-label {
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 24px;
            font-size: 14px;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          
          @media (max-width: 768px) {
            .fab-button {
              bottom: 1.5rem;
              right: 1.5rem;
              width: 56px;
              height: 56px;
            }
            .fab-button i {
              font-size: 20px;
            }
            .fab-menu {
              bottom: 6rem;
              right: 1.5rem;
            }
            .fab-menu-button {
              width: 44px;
              height: 44px;
            }
            .fab-label {
              font-size: 12px;
              padding: 6px 12px;
            }
          }
          .add-memory-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 3px dashed rgba(255, 255, 255, 0.5);
            transition: all 0.3s;
            cursor: pointer;
          }
          .add-memory-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 16px 40px rgba(102, 126, 234, 0.4);
            border-color: rgba(255, 255, 255, 0.8);
          }

          /* v4 visual system: quiet digital archive */
          :root {
            --ink: #111827;
            --forest: #10182b;
            --forest-soft: #1f2b4f;
            --paper: #f3f6fb;
            --surface: #ffffff;
            --line: #dbe3f0;
            --muted: #667085;
            --accent: #4169e1;
            --gold: #ffb547;
          }

          * { box-sizing: border-box; }
          body { background: var(--paper) !important; color: var(--ink); font-family: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif; }
          button, input, textarea, select { border-radius: 10px !important; }

          #main-app:not(.hidden) { min-height: 100vh; display: grid; grid-template-columns: 270px minmax(0, 1fr); }
          #main-app > header { position: sticky !important; top: 0; height: 100vh; background: var(--forest) !important; box-shadow: none !important; z-index: 40; overflow: hidden; }
          #main-app > header::after { content: "ARCHIVE  /  24"; position: absolute; left: 28px; bottom: 28px; color: rgba(255,255,255,.32); font-size: 12px; letter-spacing: .24em; }
          #main-app > header > div { height: 100%; padding: 30px 24px !important; max-width: none !important; }
          #main-app > header > div > div { height: 100%; display: flex !important; flex-direction: column; align-items: stretch !important; justify-content: flex-start !important; gap: 36px; }
          #main-app > header > div > div > button { justify-content: flex-start; padding: 0 6px; }
          #main-app > header h1 { color: #fff !important; font-size: 22px !important; letter-spacing: -.04em; }
          #main-app > header p { color: #9eacd0 !important; font-size: 13px !important; margin-top: 4px; }
          #main-app > header .fa-heart { color: #7aa2ff !important; }
          #main-app > header > div > div > div { display: flex !important; flex: 1; flex-direction: column; align-items: stretch !important; gap: 18px !important; }
          #main-app nav { display: flex !important; flex-direction: column; gap: 6px; }
          #main-app nav button { width: 100%; padding: 13px 14px !important; color: #dce8e3 !important; background: transparent !important; border: 1px solid transparent; text-align: left; font-size: 14px !important; }
          #main-app nav button:hover { background: rgba(255,255,255,.09) !important; border-color: rgba(255,255,255,.12); color: white !important; transform: translateX(3px); }
          #main-app > header > div > div > div > div { margin-top: auto; padding: 14px; border: 1px solid rgba(255,255,255,.12); background: rgba(65,105,225,.12); border-radius: 14px; }
          #main-app #user-name { color: white !important; flex: 1; }
          #main-app > main { width: 100%; max-width: 1500px !important; padding: 48px clamp(24px, 4vw, 64px) 90px !important; }
          #main-app h2 { color: var(--ink) !important; font-size: clamp(30px, 4vw, 48px) !important; letter-spacing: -.055em; line-height: 1; }
          #main-app h3 { letter-spacing: -.025em; }

          #statistics { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; gap: 14px !important; }
          #statistics > div { grid-column: span 3; min-height: 160px; border-radius: 18px !important; box-shadow: none; padding: 24px !important; display: flex; flex-direction: column; justify-content: space-between; background-color: var(--surface) !important; background-image: none !important; border: 1px solid var(--line); color: var(--ink) !important; }
          #statistics > div:first-child { grid-column: span 5; background-color: var(--accent) !important; background-image: none !important; border-color: var(--accent); color: white !important; }
          #statistics > div:nth-child(2) { grid-column: span 3; }
          #statistics > div:nth-child(3) { grid-column: span 2; }
          #statistics > div:nth-child(4) { grid-column: span 2; background-color: var(--forest) !important; background-image: none !important; color: white !important; }
          #statistics i { font-size: 22px !important; opacity: .72; }
          #statistics .text-4xl { font-size: 42px !important; letter-spacing: -.05em; }

          #dashboard-view > .grid > div, #dashboard-view > .bg-white { background: var(--surface) !important; border: 1px solid var(--line); border-radius: 20px !important; box-shadow: none !important; }
          #categories-chart button, #category-chips button { box-shadow: none !important; }
          .add-memory-card { background: var(--forest) !important; border: 0 !important; border-radius: 16px !important; }
          .add-memory-card:hover { transform: translateY(-3px); box-shadow: 0 16px 36px rgba(23,62,52,.18); }

          #memories-view > .flex:first-child { align-items: flex-end !important; margin-bottom: 24px !important; }
          #memories-view > .flex:first-child > .flex:last-child { background: var(--surface); border: 1px solid var(--line); padding: 8px; border-radius: 16px; box-shadow: 0 8px 30px rgba(23,33,29,.06); }
          #memories-view input, #memories-view select { border: 0 !important; background: #f1eee6; min-height: 44px; color: var(--ink); }
          #dashboard-view button.bg-gradient-to-r, #memories-view button.bg-gradient-to-r { background-color: var(--accent) !important; background-image: none !important; box-shadow: 0 10px 24px rgba(65,105,225,.24) !important; }
          #category-chips button { border-color: var(--line) !important; background: transparent !important; color: var(--muted) !important; }
          #category-chips button:first-child { background: var(--accent) !important; color: white !important; border-color: var(--accent) !important; }
          #favorites-filter, #bulk-delete-button, #memories-view button[onclick*="import-input"] { background: transparent !important; border-color: var(--line) !important; min-height: 42px; }

          #memories-grid { gap: 20px !important; }
          .memory-card { border-radius: 20px !important; border: 1px solid var(--line); background: var(--surface) !important; box-shadow: none !important; }
          .memory-card:hover { transform: translateY(-5px); border-color: #aebfe8; box-shadow: 0 18px 42px rgba(31,43,79,.12) !important; }
          .memory-card img { height: 240px; filter: saturate(.86) contrast(.96); }
          .memory-card .p-4 { padding: 20px !important; }
          .memory-card h3 { font-size: 20px !important; letter-spacing: -.04em; }
          .memory-card .category-badge { background: #eaf0ff !important; color: #3157c7 !important; }

          .fab-button { width: 62px; height: 62px; background: var(--accent) !important; box-shadow: 0 12px 30px rgba(65,105,225,.34) !important; }
          .fab-menu-button { border-color: var(--accent) !important; color: var(--accent) !important; }
          .fab-menu-button:hover { background: var(--accent) !important; color: white !important; }
          .modal { backdrop-filter: blur(9px); background: rgba(12,19,39,.68) !important; }
          .modal > div { background: var(--surface) !important; border-radius: 22px !important; border: 1px solid rgba(255,255,255,.5); }
          .modal input, .modal textarea, .modal select { background: white; border-color: var(--line) !important; }

          .auth-container { background: var(--paper) !important; }
          .auth-shell { background: var(--surface) !important; border-radius: 22px !important; overflow: hidden; }
          .auth-screen { position: relative; justify-content: flex-end !important; padding: 42px !important; background: linear-gradient(145deg, #10182b 0%, #1f2b4f 100%) !important; box-shadow: 0 24px 70px rgba(31,43,79,.2) !important; }
          .auth-screen::before { content: "당신의 기록을\\A 오래 남는 아카이브로."; white-space: pre; position: absolute; left: 7%; top: 50%; transform: translateY(-50%); width: 42%; color: white; font-size: clamp(30px, 4vw, 54px); line-height: 1.12; letter-spacing: -.06em; font-weight: 800; }
          .auth-screen::after { content: "MEMORYLINK  /  PRIVATE ARCHIVE"; position: absolute; left: 7%; bottom: 48px; color: #91a4d0; font-size: 12px; letter-spacing: .18em; }
          .auth-form-panel { width: min(390px, 44%) !important; border-radius: 18px !important; box-shadow: 0 22px 60px rgba(0,0,0,.18) !important; }
          .auth-primary-button { background: var(--accent) !important; border-radius: 10px !important; }
          .auth-brand-block .fa-heart, .auth-bottom-link button { color: var(--accent) !important; }
          .auth-form-panel .text-green-600, .auth-form-panel .text-green-700 { color: #4169e1 !important; }
          .auth-form-panel .bg-green-50 { background: #eef3ff !important; border-color: #c9d6ff !important; }

          @media (max-width: 1050px) {
            #main-app:not(.hidden) { grid-template-columns: 220px minmax(0, 1fr); }
            #statistics > div, #statistics > div:first-child { grid-column: span 6; }
          }
          @media (max-width: 768px) {
            #main-app:not(.hidden) { display: block; }
            #main-app > header { position: sticky !important; height: auto; overflow: visible; }
            #main-app > header::after { display: none; }
            #main-app > header > div { padding: 14px 18px !important; }
            #main-app > header > div > div { flex-direction: row; align-items: center !important; gap: 10px; }
            #main-app > header > div > div > div { flex-direction: row; flex: initial; margin-left: auto; }
            #main-app > header > div > div > div > div { margin: 0; padding: 8px; border: 0; background: transparent; }
            #main-app > header nav { display: none !important; }
            #main-app > header p, #main-app #user-name { display: none; }
            #main-app > main { padding: 30px 16px 90px !important; }
            #statistics { grid-template-columns: repeat(2, 1fr) !important; }
            #statistics > div, #statistics > div:first-child { grid-column: span 1; min-height: 135px; }
            #memories-view > .flex:first-child > .flex:last-child { width: 100%; align-items: stretch; }
            .memory-card img { height: 210px; }
            .auth-container { padding: 0 !important; }
            .auth-shell { width: 100%; border-radius: 0 !important; }
            .auth-screen { min-height: 100vh; height: auto; padding: 24px !important; justify-content: center !important; }
            .auth-screen::before, .auth-screen::after { display: none; }
            .auth-form-panel { width: min(390px, 100%) !important; }
          }
          /* v5 complete redesign: digital museum */
          :root {
            --museum-black: #0b0b0d;
            --museum-ink: #17171c;
            --museum-bg: #f5f5f7;
            --museum-white: #ffffff;
            --museum-line: #dedee4;
            --museum-muted: #71717a;
            --museum-violet: #6d4aff;
            --museum-lilac: #eeeaff;
            --museum-yellow: #ffd84d;
          }

          body { background: var(--museum-bg) !important; color: var(--museum-ink); }
          #main-app:not(.hidden) { display: block; min-height: 100vh; padding-top: 18px; }
          #main-app > header { position: sticky !important; top: 18px; width: calc(100% - 36px); max-width: 1420px; height: 76px; margin: 0 auto; overflow: visible; border: 1px solid rgba(222,222,228,.9); border-radius: 22px; background: rgba(255,255,255,.88) !important; backdrop-filter: blur(18px); box-shadow: 0 12px 40px rgba(15,15,20,.07) !important; }
          #main-app > header::after { display: none; }
          #main-app > header > div { height: 100%; max-width: none !important; padding: 10px 14px 10px 20px !important; }
          #main-app > header > div > div { height: 100%; display: flex !important; flex-direction: row; align-items: center !important; justify-content: space-between !important; gap: 20px; }
          #main-app > header > div > div > button { min-width: 205px; padding: 0 !important; }
          #main-app > header h1 { color: var(--museum-black) !important; font-size: 19px !important; letter-spacing: -.04em; }
          #main-app > header p { display: none; }
          #main-app > header .fa-heart { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 12px; color: white !important; background: var(--museum-black); font-size: 16px !important; }
          #main-app > header > div > div > div { flex: 1; display: flex !important; flex-direction: row; align-items: center !important; justify-content: flex-end; gap: 18px !important; }
          #main-app nav { display: flex !important; flex-direction: row; justify-content: center; gap: 2px; }
          #main-app nav button { width: auto; padding: 11px 13px !important; color: #50505a !important; background: transparent !important; border: 0; border-radius: 12px !important; font-size: 14px !important; white-space: nowrap; }
          #main-app nav button:hover { color: var(--museum-black) !important; background: #f0f0f3 !important; transform: none; }
          #main-app nav button:last-child { color: white !important; background: var(--museum-violet) !important; margin-left: 6px; }
          #main-app > header > div > div > div > div { margin: 0; padding: 6px 8px 6px 6px; min-width: 170px; border: 1px solid var(--museum-line); border-radius: 14px; background: white; }
          #main-app #user-name { display: inline; color: var(--museum-black) !important; }
          #main-app > main { width: calc(100% - 36px); max-width: 1420px !important; padding: 64px 8px 100px !important; margin: 0 auto; }
          #main-app h2 { color: var(--museum-black) !important; font-size: clamp(38px, 5vw, 70px) !important; letter-spacing: -.075em; font-weight: 900; }
          #main-app h3 { color: var(--museum-black); }

          #dashboard-view > .flex:first-child { align-items: flex-end !important; margin-bottom: 36px !important; }
          #dashboard-view > .flex:first-child::after { content: "나의 기록 컬렉션"; margin-right: auto; margin-left: 24px; padding-bottom: 5px; color: var(--museum-muted); font-size: 15px; }
          #dashboard-view button.bg-gradient-to-r, #memories-view button.bg-gradient-to-r { padding: 13px 18px !important; background: var(--museum-black) !important; background-image: none !important; border-radius: 14px !important; box-shadow: none !important; }

          #statistics { display: grid !important; grid-template-columns: 1.6fr 1fr 1fr 1fr !important; gap: 14px !important; margin-bottom: 22px !important; }
          #statistics > div, #statistics > div:first-child, #statistics > div:nth-child(4) { grid-column: auto; min-height: 190px; padding: 24px !important; border: 1px solid var(--museum-line); border-radius: 24px !important; background: var(--museum-white) !important; color: var(--museum-black) !important; }
          #statistics > div:first-child { color: white !important; background: var(--museum-violet) !important; border-color: var(--museum-violet); }
          #statistics > div:nth-child(3) { background: var(--museum-yellow) !important; border-color: var(--museum-yellow); }
          #statistics > div:nth-child(4) { color: white !important; background: var(--museum-black) !important; border-color: var(--museum-black); }
          #statistics i { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; background: rgba(127,127,140,.12); font-size: 17px !important; }
          #statistics .text-4xl { font-size: 54px !important; line-height: 1; }

          #dashboard-view > .grid { gap: 22px !important; }
          #dashboard-view > .grid > div, #dashboard-view > .bg-white { border: 1px solid var(--museum-line); border-radius: 26px !important; background: var(--museum-white) !important; box-shadow: none !important; padding: 28px !important; }
          #categories-chart > div:first-child { background: var(--museum-black) !important; background-image: none !important; border-radius: 20px !important; }
          .add-memory-card { background: var(--museum-lilac) !important; color: var(--museum-violet) !important; border: 1px dashed #bcaeff !important; border-radius: 18px !important; }
          .add-memory-card:hover { transform: translateY(-3px); box-shadow: none !important; border-color: var(--museum-violet) !important; }

          #memories-view > .flex:first-child { display: grid !important; grid-template-columns: 1fr auto; align-items: end !important; gap: 30px; margin-bottom: 22px !important; }
          #memories-view > .flex:first-child > .flex:last-child { padding: 7px; border: 1px solid var(--museum-line); border-radius: 16px; background: white; box-shadow: none; }
          #memories-view input, #memories-view select { min-height: 46px; border: 0 !important; background: #f2f2f5; color: var(--museum-black); }
          #category-chips { gap: 8px !important; }
          #category-chips button { padding: 9px 14px !important; border: 1px solid var(--museum-line) !important; border-radius: 999px !important; background: white !important; color: #555560 !important; }
          #category-chips button:first-child { border-color: var(--museum-black) !important; background: var(--museum-black) !important; color: white !important; }
          #favorites-filter, #bulk-delete-button, #memories-view button[onclick*="import-input"] { min-height: 42px; border: 1px solid var(--museum-line) !important; border-radius: 12px !important; background: white !important; }

          #memories-grid { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; gap: 18px !important; }
          .memory-card { grid-column: span 4; border: 0; border-radius: 24px !important; background: white !important; box-shadow: 0 1px 0 rgba(0,0,0,.06) !important; }
          .memory-card:nth-child(5n+1), .memory-card:nth-child(5n+2) { grid-column: span 6; }
          .memory-card:hover { transform: translateY(-6px); border: 0; box-shadow: 0 22px 60px rgba(20,20,28,.12) !important; }
          .memory-card img { height: 280px; filter: none; }
          .memory-card:nth-child(5n+1) img, .memory-card:nth-child(5n+2) img { height: 360px; }
          .memory-card .p-4 { padding: 22px !important; }
          .memory-card h3 { font-size: 23px !important; font-weight: 850; }
          .memory-card .category-badge { border-radius: 999px !important; background: var(--museum-lilac) !important; color: var(--museum-violet) !important; }
          .memory-card label, .memory-card > button { width: 38px !important; height: 38px !important; border-radius: 50% !important; }

          .fab-button { width: 64px; height: 64px; border-radius: 20px !important; background: var(--museum-violet) !important; box-shadow: 0 16px 36px rgba(109,74,255,.3) !important; }
          .fab-menu-button { border-color: var(--museum-black) !important; color: var(--museum-black) !important; }
          .fab-menu-button:hover { background: var(--museum-black) !important; }
          .modal { background: rgba(10,10,14,.72) !important; backdrop-filter: blur(14px); }
          .modal > div { border: 0; border-radius: 28px !important; background: white !important; box-shadow: 0 34px 90px rgba(0,0,0,.3); }
          .modal input, .modal textarea, .modal select { border: 1px solid var(--museum-line) !important; border-radius: 12px !important; background: #f8f8fa; }

          .auth-container { padding: 18px !important; background: var(--museum-bg) !important; }
          .auth-shell { width: min(1180px, calc(100vw - 36px)); border-radius: 30px !important; background: white !important; }
          .auth-screen { min-height: 720px; padding: 48px !important; background: var(--museum-black) !important; border-radius: 30px; }
          .auth-screen::before { content: "기록은 사라지지 않고,\\A 새로운 이야기가 됩니다."; color: white; font-size: clamp(34px, 4.6vw, 64px); }
          .auth-screen::after { color: #85858f; }
          .auth-form-panel { width: min(420px, 43%) !important; min-height: 620px; padding: 46px 34px 28px !important; border-radius: 24px !important; }
          .auth-brand-block .fa-heart { width: 58px; height: 58px; display: grid; place-items: center; border-radius: 18px; color: white !important; background: var(--museum-violet); font-size: 25px !important; }
          .auth-primary-button { background: var(--museum-violet) !important; box-shadow: 0 12px 28px rgba(109,74,255,.25) !important; }
          .auth-bottom-link button { color: var(--museum-violet) !important; }
          .auth-form-panel .text-green-600, .auth-form-panel .text-green-700 { color: var(--museum-violet) !important; }

          @media (max-width: 1050px) {
            #main-app nav button { padding: 10px !important; font-size: 0 !important; }
            #main-app nav button i { margin: 0 !important; font-size: 15px; }
            #statistics { grid-template-columns: repeat(2, 1fr) !important; }
            .memory-card, .memory-card:nth-child(5n+1), .memory-card:nth-child(5n+2) { grid-column: span 6; }
          }
          @media (max-width: 768px) {
            #main-app:not(.hidden) { padding-top: 0; }
            #main-app > header { top: 0; width: 100%; height: 68px; border-width: 0 0 1px; border-radius: 0; }
            #main-app > header > div { padding: 9px 14px !important; }
            #main-app > header > div > div > button { min-width: 0; }
            #main-app > header h1 { font-size: 17px !important; }
            #main-app > header > div > div > div { flex: initial; }
            #main-app > header > div > div > div > div { min-width: 0; border: 0; padding: 0; }
            #main-app #user-name, #main-app > header nav { display: none !important; }
            #main-app > main { width: 100%; padding: 40px 16px 90px !important; }
            #dashboard-view > .flex:first-child::after { display: none; }
            #statistics { grid-template-columns: repeat(2, 1fr) !important; }
            #statistics > div, #statistics > div:first-child, #statistics > div:nth-child(4) { min-height: 148px; padding: 18px !important; }
            #statistics .text-4xl { font-size: 40px !important; }
            #memories-view > .flex:first-child { display: flex !important; align-items: stretch !important; }
            .memory-card, .memory-card:nth-child(5n+1), .memory-card:nth-child(5n+2) { grid-column: span 12; }
            .memory-card img, .memory-card:nth-child(5n+1) img, .memory-card:nth-child(5n+2) img { height: 250px; }
            .auth-container { padding: 0 !important; }
            .auth-shell, .auth-screen { width: 100%; min-height: 100vh; border-radius: 0 !important; }
            .auth-screen { justify-content: center !important; padding: 22px !important; background: var(--museum-black) !important; }
            .auth-screen::before, .auth-screen::after { display: none; }
            .auth-form-panel { width: min(420px, 100%) !important; }
          }
          /* v6 refined product UI */
          :root { --ui-blue:#2563eb; --ui-blue-dark:#1d4ed8; --ui-navy:#0f172a; --ui-bg:#f7f9fc; --ui-card:#fff; --ui-border:#e5eaf2; --ui-muted:#64748b; }
          body { background: var(--ui-bg) !important; color: var(--ui-navy); }
          #main-app:not(.hidden) { display:block; padding:0; }
          #main-app > header { position:sticky !important; top:0; width:100%; max-width:none; height:72px; margin:0; border:0; border-bottom:1px solid var(--ui-border); border-radius:0; background:rgba(255,255,255,.96) !important; box-shadow:none !important; }
          #main-app > header > div { max-width:1320px !important; margin:0 auto; padding:10px 24px !important; }
          #main-app > header > div > div { gap:28px; }
          #main-app > header > div > div > button { min-width:190px; }
          #main-app > header .fa-heart { width:38px; height:38px; border-radius:11px; background:linear-gradient(135deg,#2563eb,#60a5fa); }
          #main-app > header h1 { font-size:20px !important; }
          #main-app nav { gap:4px; }
          #main-app nav button { padding:10px 12px !important; border-radius:9px !important; color:#475569 !important; }
          #main-app nav button:hover { background:#eff6ff !important; color:var(--ui-blue) !important; }
          #main-app nav button:last-child { background:var(--ui-blue) !important; color:#fff !important; border-radius:10px !important; }
          #main-app > header > div > div > div > div { min-width:160px; border:0; background:#f1f5f9; border-radius:12px; }
          #main-app > main { width:100%; max-width:1320px !important; margin:0 auto; padding:44px 24px 90px !important; }
          #main-app h2 { font-size:38px !important; line-height:1.15; letter-spacing:-.045em; font-weight:800; }
          #dashboard-view > .flex:first-child { align-items:center !important; margin-bottom:28px !important; }
          #dashboard-view > .flex:first-child::after { display:none; }
          #dashboard-view button.bg-gradient-to-r, #memories-view button.bg-gradient-to-r { background:var(--ui-blue) !important; padding:12px 18px !important; border-radius:10px !important; box-shadow:0 8px 18px rgba(37,99,235,.2) !important; }

          #statistics { display:grid !important; grid-template-columns:repeat(4,minmax(0,1fr)) !important; gap:16px !important; margin-bottom:24px !important; }
          #statistics > .metric-card { grid-column:auto !important; min-height:148px; padding:22px !important; border:1px solid var(--ui-border) !important; border-radius:16px !important; background:#fff !important; color:var(--ui-navy) !important; box-shadow:0 4px 14px rgba(15,23,42,.035) !important; }
          #statistics > .metric-card.metric-primary { background:linear-gradient(135deg,#2563eb,#3b82f6) !important; border-color:#2563eb !important; color:#fff !important; }
          #statistics > .metric-card:nth-child(4) { background:#fff !important; border-color:var(--ui-border) !important; color:var(--ui-navy) !important; }
          #statistics > .metric-card i { width:36px; height:36px; border-radius:10px; background:#eff6ff; color:var(--ui-blue); }
          #statistics > .metric-card.metric-primary i { background:rgba(255,255,255,.18); color:#fff; }
          #statistics > .metric-card .text-4xl { font-size:38px !important; }
          #dashboard-view > .grid { gap:20px !important; }
          #dashboard-view > .grid > div, #dashboard-view > .bg-white { padding:24px !important; border:1px solid var(--ui-border); border-radius:18px !important; background:#fff !important; box-shadow:0 5px 18px rgba(15,23,42,.04) !important; }
          #categories-chart > div:first-child { background:linear-gradient(135deg,#172554,#1e3a8a) !important; border-radius:14px !important; }
          .add-memory-card { background:#eff6ff !important; color:var(--ui-blue) !important; border:1px dashed #93c5fd !important; border-radius:14px !important; }

          #memories-view > .flex:first-child { display:flex !important; align-items:center !important; margin-bottom:20px !important; }
          #memories-view > .flex:first-child > .flex:last-child { padding:6px; border:1px solid var(--ui-border); border-radius:12px; background:#fff; }
          #memories-view input, #memories-view select { min-height:42px; border-radius:8px !important; background:#f8fafc; }
          #category-chips button { padding:8px 13px !important; border-color:var(--ui-border) !important; border-radius:9px !important; background:#fff !important; }
          #category-chips button:first-child { border-color:var(--ui-blue) !important; background:var(--ui-blue) !important; }
          #memories-grid { grid-template-columns:repeat(3,minmax(0,1fr)) !important; gap:20px !important; }
          .memory-card, .memory-card:nth-child(5n+1), .memory-card:nth-child(5n+2) { grid-column:auto; border:1px solid var(--ui-border); border-radius:16px !important; box-shadow:0 4px 14px rgba(15,23,42,.04) !important; }
          .memory-card:hover { transform:translateY(-4px); border-color:#bfdbfe; box-shadow:0 16px 32px rgba(37,99,235,.1) !important; }
          .memory-card img, .memory-card:nth-child(5n+1) img, .memory-card:nth-child(5n+2) img { height:230px; }
          .memory-card .p-4 { padding:18px !important; }
          .memory-card h3 { font-size:19px !important; }
          .memory-card .category-badge { background:#eff6ff !important; color:var(--ui-blue) !important; }
          .fab-button { width:58px; height:58px; border-radius:16px !important; background:var(--ui-blue) !important; box-shadow:0 12px 28px rgba(37,99,235,.28) !important; }
          .fab-menu-button { border-color:var(--ui-blue) !important; color:var(--ui-blue) !important; }
          .fab-menu-button:hover { background:var(--ui-blue) !important; }
          .modal { background:rgba(15,23,42,.6) !important; backdrop-filter:blur(8px); }
          .modal > div { border-radius:20px !important; box-shadow:0 28px 70px rgba(15,23,42,.26); }

          .auth-container { padding:24px !important; background:linear-gradient(135deg,#eff6ff 0%,#f8fafc 48%,#eef2ff 100%) !important; }
          .auth-shell { width:min(1050px,calc(100vw - 48px)); border-radius:24px !important; box-shadow:0 25px 70px rgba(30,64,175,.12); }
          .auth-screen { min-height:680px; padding:44px !important; border-radius:24px; background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#60a5fa 100%) !important; }
          .auth-screen::before { content:"소중한 순간을\\A한곳에서 관리하세요."; font-size:clamp(34px,4.2vw,56px); }
          .auth-screen::after { content:"MEMORYLINK · DIGITAL ARCHIVE"; color:#bfdbfe; }
          .auth-form-panel { width:min(400px,44%) !important; min-height:590px; padding:40px 32px 26px !important; border-radius:18px !important; }
          .auth-brand-block .fa-heart { border-radius:14px; background:linear-gradient(135deg,#2563eb,#60a5fa); }
          .auth-primary-button { background:var(--ui-blue) !important; border-radius:10px !important; box-shadow:0 10px 22px rgba(37,99,235,.22) !important; }
          .auth-bottom-link button, .auth-form-panel .text-green-600, .auth-form-panel .text-green-700 { color:var(--ui-blue) !important; }

          @media(max-width:1000px){ #main-app nav button{font-size:0 !important} #main-app nav button i{font-size:15px} #statistics{grid-template-columns:repeat(2,1fr)!important} #memories-grid{grid-template-columns:repeat(2,1fr)!important} }
          @media(max-width:768px){ #main-app>header{height:64px} #main-app>header>div{padding:8px 14px!important} #main-app>header>div>div>button{min-width:0} #main-app nav{display:none!important} #main-app>header>div>div>div>div{min-width:0;background:transparent} #main-app #user-name{display:none} #main-app>main{padding:32px 16px 80px!important} #statistics{grid-template-columns:repeat(2,1fr)!important} #statistics>.metric-card{min-height:132px;padding:17px!important} #memories-grid{grid-template-columns:1fr!important} .memory-card,.memory-card:nth-child(5n+1),.memory-card:nth-child(5n+2){grid-column:auto} .auth-container{padding:0!important}.auth-shell,.auth-screen{width:100%;min-height:100vh;border-radius:0!important}.auth-screen{justify-content:center!important;padding:20px!important}.auth-screen::before,.auth-screen::after{display:none}.auth-form-panel{width:min(400px,100%)!important} }
          .memory-card-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:16px; padding-top:14px; border-top:1px solid var(--ui-border); }
          .memory-card-actions button { min-height:40px; display:inline-flex; align-items:center; justify-content:center; gap:7px; border-radius:9px !important; font-size:14px; font-weight:700; transition:background .18s ease,color .18s ease,border-color .18s ease; }
          .memory-edit-button { border:1px solid #bfdbfe; background:#eff6ff; color:#1d4ed8; }
          .memory-edit-button:hover { border-color:#2563eb; background:#2563eb; color:#fff; }
          .memory-delete-button { border:1px solid #fecaca; background:#fff1f2; color:#dc2626; }
          .memory-delete-button:hover { border-color:#dc2626; background:#dc2626; color:#fff; }
          @media(max-width:480px){ .memory-card-actions button{min-height:44px;font-size:15px} }
        </style>
        <link rel="stylesheet" href="/static/premium.css">
    </head>
    <body class="bg-gray-50">
        <!-- Auth Container -->
        <div id="auth-container" class="auth-container">
            <div class="auth-shell">
                <h2 id="auth-title" class="auth-column-title">
                    <span class="auth-story-kicker">MemoryLink · Private Archive</span>
                    <span class="auth-story-body auth-story-register">
                        <span class="auth-story-title">당신의 기억을<br>안전하게 이어주세요.</span>
                        <span class="auth-story-copy">사진과 기록에 담긴 감정까지 AI가 정리해<br>오래도록 다시 꺼내볼 수 있게 보관합니다.</span>
                    </span>
                    <span class="auth-story-body auth-story-login">
                        <span class="auth-story-title">기억을 다시 만나는<br>가장 조용한 시간.</span>
                        <span class="auth-story-copy">보관해 둔 순간과 감정을<br>언제든 편안하게 다시 꺼내보세요.</span>
                    </span>
                    <span class="auth-story-points">
                        <span><i class="fas fa-lock"></i> 나만의 비공개 보관함</span>
                        <span><i class="fas fa-brain"></i> AI 감정 및 장면 분석</span>
                        <span><i class="fas fa-download"></i> 언제든 데이터 백업</span>
                    </span>
                </h2>
                <div class="auth-screen">
                    <div id="register-form" class="auth-form-panel">
                        <div class="auth-brand-block">
                            <i class="fas fa-heart text-5xl text-purple-600 mb-4"></i>
                            <h1 class="text-3xl font-extrabold text-gray-900">MemoryLink</h1>
                            <p class="text-xs text-gray-500 mt-2">새로운 개인 아카이브를 시작하세요</p>
                        </div>
                        <div class="auth-form-heading">
                            <span>01</span>
                            <div><h3 class="auth-form-title text-xl font-extrabold text-gray-900">계정 만들기</h3><p>간단한 정보만 입력하면 바로 시작할 수 있어요.</p></div>
                        </div>
                        <div id="register-success-message" class="hidden rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 mb-3">
                            회원가입이 완료되었습니다. 로그인해 주세요.
                        </div>
                        <form id="register-submit" class="auth-form-body space-y-5">
                            <div>
                                <label class="block text-xs font-semibold text-gray-700 mb-1.5">이름</label>
                                <input type="text" id="register-name" required class="auth-input">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-700 mb-1.5">이메일</label>
                                <input type="email" id="register-email" required class="auth-input">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-700 mb-1.5">비밀번호</label>
                                <div class="relative">
                                    <input type="password" id="register-password" required minlength="6" class="auth-input pr-10">
                                    <button type="button" onclick="togglePasswordVisibility('register-password', 'register-password-toggle-icon')" class="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-purple-600 transition" aria-label="비밀번호 보기" title="비밀번호 보기">
                                        <i id="register-password-toggle-icon" class="fas fa-eye"></i>
                                    </button>
                                </div>
                                <p class="text-xs text-green-600 mt-2">비밀번호는 최소 6자 이상으로 작성합니다.</p>
                            </div>
                            <button type="submit" class="auth-primary-button">가입하기</button>
                        </form>
                        <p class="auth-bottom-link text-sm text-gray-500">
                            이미 계정이 있으신가요?
                            <button type="button" onclick="showLogin()" class="text-purple-600 hover:text-purple-700 font-bold">로그인</button>
                        </p>
                    </div>

                    <div id="login-form" class="auth-form-panel hidden">
                        <div class="auth-brand-block">
                            <i class="fas fa-heart text-5xl text-purple-600 mb-5"></i>
                            <h1 class="text-3xl font-extrabold text-gray-900">MemoryLink</h1>
                            <p class="text-xs text-gray-500 mt-2">당신의 아카이브로 돌아오세요</p>
                        </div>
                        <div class="auth-form-heading">
                            <span><i class="fas fa-key"></i></span>
                            <div><h3 class="auth-form-title text-xl font-extrabold text-gray-900">로그인</h3><p>저장된 추억을 계속 이어가세요.</p></div>
                        </div>
                        <form id="login-submit" class="auth-form-body space-y-5">
                            <div>
                                <label class="block text-xs font-semibold text-gray-700 mb-1.5">이메일</label>
                                <input type="email" id="login-email" required class="auth-input">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-700 mb-1.5">비밀번호</label>
                                <div class="relative">
                                    <input type="password" id="login-password" required class="auth-input pr-10">
                                    <button type="button" onclick="togglePasswordVisibility('login-password', 'login-password-toggle-icon')" class="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-purple-600 transition" aria-label="비밀번호 보기" title="비밀번호 보기">
                                        <i id="login-password-toggle-icon" class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            <button type="submit" class="auth-primary-button">로그인</button>
                        </form>
                        <p class="auth-bottom-link text-sm text-gray-500">
                            계정이 없으신가요?
                            <button type="button" onclick="showRegister()" class="text-purple-600 hover:text-purple-700 font-bold">회원가입</button>
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main App Container (hidden until logged in) -->
        <div id="main-app" class="hidden">
            <!-- Header -->
            <header class="sticky top-0 z-40" style="background:#1b1a17 !important;border-color:#1b1a17 !important">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex items-center justify-between">
                        <button onclick="showView('dashboard')" class="flex items-center space-x-3 text-left hover:opacity-80 transition" title="메인화면">
                            <i class="fas fa-heart text-3xl text-purple-600"></i>
                            <div>
                                <h1 class="text-2xl font-bold text-gray-900">MemoryLink</h1>
                                <p class="text-xs text-gray-500">Private Digital Archive</p>
                            </div>
                        </button>
                        <div class="flex items-center space-x-4">
                            <nav class="hidden md:flex space-x-2">
                                <button onclick="showView('dashboard')" class="nav-btn px-3 py-2 text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition">
                                    <i class="fas fa-wand-magic-sparkles mr-1"></i>오늘의 기억
                                </button>
                                <button onclick="showView('memories')" class="nav-btn px-3 py-2 text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition">
                                    <i class="fas fa-images mr-1"></i>추억
                                </button>
                                <button onclick="showView('timeline')" class="nav-btn px-3 py-2 text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition">
                                    <i class="fas fa-stream mr-1"></i>타임라인
                                </button>
                                <button onclick="showRandomMemory()" class="px-3 py-2 text-sm text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                                    <i class="fas fa-shuffle mr-1"></i>추억 다시보기
                                </button>
                                <button onclick="exportData()" class="px-3 py-2 text-sm text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
                                    <i class="fas fa-download mr-1"></i>내보내기
                                </button>
                                <button onclick="showAddMemory()" class="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                                    <i class="fas fa-plus mr-1"></i>추억 추가
                                </button>
                            </nav>
                            <div class="flex items-center space-x-2">
                                <img id="user-avatar" src="" alt="User" class="w-8 h-8 rounded-full">
                                <span id="user-name" class="text-sm font-medium text-gray-700"></span>
                                <button onclick="logout()" class="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-semibold">
                                    <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- Dashboard View -->
                <div id="dashboard-view" class="view-section">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <p class="recall-page-kicker">AI MEMORY RECALL</p>
                            <h2 class="text-3xl font-bold text-gray-900">오늘의 기억</h2>
                            <p class="recall-page-description">기록을 쌓는 데서 끝나지 않도록, 다시 만날 순간을 골라드려요.</p>
                        </div>
                        <button onclick="showAddMemory()" class="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition font-semibold shadow-lg">
                            <i class="fas fa-plus-circle mr-2"></i>새 추억 추가
                        </button>
                    </div>

                    <!-- AI Memory Recall -->
                    <section id="recall-hub" class="recall-hub" aria-labelledby="recall-hub-title">
                        <div class="recall-loading"><i class="fas fa-circle-notch fa-spin"></i> 오늘 다시 만날 기억을 고르고 있어요.</div>
                    </section>
                    
                    <!-- Statistics -->
                    <div id="statistics" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div class="metric-card metric-primary p-6 rounded-xl">
                            <i class="fas fa-database text-3xl mb-2"></i>
                            <p class="text-sm opacity-90">총 추억</p>
                            <p id="total-memories" class="text-4xl font-bold">0</p>
                        </div>
                        <div class="metric-card p-6 rounded-xl">
                            <i class="fas fa-smile text-3xl mb-2"></i>
                            <p class="text-sm opacity-90">긍정적 추억</p>
                            <p id="positive-memories" class="text-4xl font-bold">0</p>
                        </div>
                        <div class="metric-card p-6 rounded-xl">
                            <i class="fas fa-meh text-3xl mb-2"></i>
                            <p class="text-sm opacity-90">중립적 추억</p>
                            <p id="neutral-memories" class="text-4xl font-bold">0</p>
                        </div>
                        <button type="button" onclick="showImportanceChart()" class="metric-card metric-clickable p-6 rounded-xl" aria-label="평균 중요도 분포 그래프 보기">
                            <i class="fas fa-chart-line text-3xl mb-2"></i>
                            <p class="text-sm opacity-90">평균 중요도</p>
                            <p id="avg-importance" class="text-4xl font-bold">0</p>
                            <span class="metric-card-hint">분포 보기 <i class="fas fa-arrow-right"></i></span>
                        </button>
                    </div>

                    <!-- Collection Health -->
                    <div class="bg-white rounded-xl shadow-sm p-6 mb-8">
                        <div class="flex items-center justify-between mb-5">
                            <div>
                                <h3 class="text-xl font-bold text-gray-900">보관함 현황</h3>
                                <p class="text-sm text-gray-500 mt-1">많이 남긴 기록과 아직 비어있는 기록을 한눈에 확인하세요</p>
                            </div>
                            <button onclick="showAddMemory()" class="hidden sm:inline-flex items-center px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition font-semibold text-sm">
                                <i class="fas fa-plus mr-2"></i>바로 추가
                            </button>
                        </div>
                        <div id="categories-chart" class="space-y-4"></div>
                    </div>

                    <!-- Recent Memories -->
                    <div class="bg-white rounded-xl shadow-sm p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-bold text-gray-900">최근 추억</h3>
                            <button onclick="showView('memories')" class="text-sm text-purple-600 hover:text-purple-700 font-semibold">
                                모두 보기 <i class="fas fa-arrow-right ml-1"></i>
                            </button>
                        </div>
                        <div id="recent-memories" class="space-y-3"></div>
                        
                        <!-- Quick Add Button in Dashboard -->
                        <div onclick="showAddMemory()" class="add-memory-card mt-4 p-6 rounded-xl text-white text-center">
                            <i class="fas fa-plus-circle text-5xl mb-3 opacity-90"></i>
                            <p class="text-lg font-bold mb-1">첫 번째 추억을 추가하세요</p>
                            <p class="text-sm opacity-75">클릭하여 소중한 순간을 기록하세요</p>
                        </div>
                    </div>
                </div>

                <!-- Memories View -->
                <div id="memories-view" class="view-section hidden">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div class="flex items-center gap-3">
                            <button onclick="showView('dashboard')" class="w-11 h-11 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-purple-700 hover:border-purple-300 hover:bg-purple-50 transition shadow-sm" title="메인화면">
                                <i class="fas fa-home"></i>
                            </button>
                            <h2 class="text-3xl font-bold text-gray-900">내 추억</h2>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button onclick="showView('dashboard')" class="sm:hidden px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-purple-50 hover:text-purple-700 transition font-semibold shadow-sm">
                                <i class="fas fa-home mr-2"></i>메인화면
                            </button>
                            <button onclick="showAddMemory()" class="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition font-semibold shadow-lg">
                                <i class="fas fa-plus-circle mr-2"></i>새 추억 추가
                            </button>
                            <select id="category-filter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="">모든 카테고리</option>
                            </select>
                            <select id="sort-filter" aria-label="추억 정렬" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="newest">최신순</option>
                                <option value="oldest">오래된순</option>
                                <option value="importance">중요도순</option>
                                <option value="title">제목순</option>
                            </select>
                            <select id="emotion-filter" aria-label="AI 감정 필터" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="">모든 감정</option>
                                <option value="positive">😊 긍정 감정</option>
                                <option value="neutral">😌 차분한 감정</option>
                                <option value="negative">😣 불편한 감정</option>
                            </select>
                            <input id="search-input" type="text" placeholder="검색..." class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <div id="category-chips" class="flex flex-wrap gap-2"></div>
                        <div class="flex flex-wrap gap-2">
                            <button id="favorites-filter" type="button" onclick="toggleFavoritesFilter()" class="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:border-amber-300 transition text-sm font-semibold">
                                <i class="far fa-star mr-1"></i>즐겨찾기만
                            </button>
                            <button id="bulk-delete-button" type="button" onclick="bulkDeleteSelected()" disabled class="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-600 disabled:opacity-40 transition text-sm font-semibold">
                                <i class="fas fa-trash mr-1"></i>선택 삭제 <span id="selected-count">0</span>
                            </button>
                            <button type="button" onclick="document.getElementById('import-input').click()" class="px-4 py-2 rounded-lg bg-white border border-green-200 text-green-700 hover:bg-green-50 transition text-sm font-semibold">
                                <i class="fas fa-file-import mr-1"></i>백업 복원
                            </button>
                            <input id="import-input" type="file" accept="application/json,.json" class="hidden">
                        </div>
                    </div>
                    
                    <div id="memories-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <!-- Add Memory Card will be injected here -->
                    </div>
                    
                    <!-- Pagination -->
                    <div id="pagination" class="flex justify-center mt-8 space-x-2"></div>
                </div>

                <!-- Timeline View -->
                <div id="timeline-view" class="view-section hidden">
                    <h2 class="text-3xl font-bold text-gray-900 mb-6">타임라인</h2>
                    <div id="timeline-content" class="space-y-6"></div>
                </div>

                <!-- Floating Action Button with Sub-menu -->
                <div class="fab-menu">
                    <div class="fab-menu-item" id="fab-photo">
                        <span class="fab-label">사진 추가</span>
                        <button onclick="showAddMemory('photo')" class="fab-menu-button">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    <div class="fab-menu-item" id="fab-video">
                        <span class="fab-label">동영상 추가</span>
                        <button onclick="showAddMemory('video')" class="fab-menu-button">
                            <i class="fas fa-video"></i>
                        </button>
                    </div>
                    <div class="fab-menu-item" id="fab-document">
                        <span class="fab-label">문서 추가</span>
                        <button onclick="showAddMemory('document')" class="fab-menu-button">
                            <i class="fas fa-file-alt"></i>
                        </button>
                    </div>
                    <div class="fab-menu-item" id="fab-sns">
                        <span class="fab-label">SNS 게시물</span>
                        <button onclick="showAddMemory('sns')" class="fab-menu-button">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
                
                <button onclick="toggleFabMenu()" class="fab-button" title="추억 추가">
                    <i class="fas fa-plus"></i>
                </button>

                <!-- Add/Edit Memory Modal -->
                <div id="memory-modal" class="modal fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
                    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div class="p-6">
                            <div class="flex justify-between items-center mb-6">
                                <h3 id="modal-title" class="text-2xl font-bold text-gray-900">추억 추가</h3>
                                <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
                                    <i class="fas fa-times text-2xl"></i>
                                </button>
                            </div>
                            
                            <form id="memory-form" class="space-y-4">
                                <input type="hidden" id="memory-id">
                                
                                <!-- File Upload Area -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        파일 업로드 (이미지/동영상)
                                    </label>
                                    <div id="upload-area" class="upload-area p-8 rounded-lg text-center cursor-pointer">
                                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                                        <p class="text-sm text-gray-600">클릭하거나 파일을 드래그하세요</p>
                                        <p class="text-xs text-gray-400 mt-1">스크린샷을 복사 후 Ctrl+V로 붙여넣기 가능</p>
                                        <p class="text-xs text-gray-400 mt-1">또는 아래에 URL을 직접 입력하세요</p>
                                        <input type="file" id="file-input" class="hidden" accept="image/*,video/*">
                                    </div>
                                    <input type="text" id="file-url" placeholder="또는 파일 URL 입력" class="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm">
                                    <div id="file-preview" class="mt-2"></div>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">제목 *</label>
                                    <input type="text" id="title" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                                    <select id="category" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                        <option value="">선택하세요</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">설명</label>
                                    <textarea id="description" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"></textarea>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">내용</label>
                                    <textarea id="content" rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"></textarea>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">태그</label>
                                    <input type="text" id="tags" maxlength="200" placeholder="예: 가족, 제주도, 생일" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                    <p class="text-xs text-gray-400 mt-1">쉼표로 구분해 최대 10개까지 입력할 수 있습니다.</p>
                                </div>

                                <div>
                                    <label class="flex items-center space-x-2">
                                        <input type="checkbox" id="auto-analyze" checked class="rounded text-purple-600 focus:ring-purple-500">
                                        <span class="text-sm text-gray-700">
                                            <i class="fas fa-robot text-purple-600"></i>
                                            AI 자동 분석 (요약, 감정, 키워드)
                                        </span>
                                    </label>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">중요도 (1-10)</label>
                                    <input type="range" id="importance-score" min="1" max="10" value="5" class="w-full">
                                    <div class="flex justify-between text-xs text-gray-500">
                                        <span>1</span>
                                        <span id="importance-value" class="font-bold text-purple-600">5</span>
                                        <span>10</span>
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">원본 날짜</label>
                                    <input type="datetime-local" id="original-date" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                </div>
                                
                                <div class="flex justify-end space-x-3 pt-4">
                                    <button type="button" onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                                        취소
                                    </button>
                                    <button type="submit" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                                        <i class="fas fa-save mr-2"></i>저장
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Memory Detail Modal -->
                <div id="detail-modal" class="modal fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
                    <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div class="p-6" id="detail-content">
                            <!-- Content loaded dynamically -->
                        </div>
                    </div>
                </div>

                <!-- Importance Distribution Modal -->
                <div id="importance-modal" class="modal fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50" onclick="if(event.target === this) closeImportanceChart()">
                    <section class="importance-modal-panel" role="dialog" aria-modal="true" aria-labelledby="importance-chart-title">
                        <header class="importance-modal-header">
                            <div>
                                <p>MEMORY INSIGHT</p>
                                <h3 id="importance-chart-title">중요도 분포</h3>
                            </div>
                            <button type="button" onclick="closeImportanceChart()" aria-label="중요도 그래프 닫기"><i class="fas fa-times"></i></button>
                        </header>
                        <div id="importance-chart-content"></div>
                    </section>
                </div>

                <nav class="mobile-bottom-nav" aria-label="모바일 주요 메뉴">
                    <button type="button" data-mobile-view="dashboard" class="mobile-tab active" onclick="showView('dashboard')" aria-label="홈">
                        <i class="fas fa-home" aria-hidden="true"></i><span>홈</span>
                    </button>
                    <button type="button" data-mobile-view="memories" class="mobile-tab" onclick="showView('memories')" aria-label="추억">
                        <i class="fas fa-images" aria-hidden="true"></i><span>추억</span>
                    </button>
                    <button type="button" class="mobile-add-tab" onclick="showAddMemory()" aria-label="새 추억 추가">
                        <i class="fas fa-plus" aria-hidden="true"></i><span>추가</span>
                    </button>
                    <button type="button" data-mobile-view="timeline" class="mobile-tab" onclick="showView('timeline')" aria-label="타임라인">
                        <i class="fas fa-stream" aria-hidden="true"></i><span>타임라인</span>
                    </button>
                    <button type="button" class="mobile-tab" onclick="showRandomMemory()" aria-label="추억 다시보기">
                        <i class="fas fa-shuffle" aria-hidden="true"></i><span>다시보기</span>
                    </button>
                </nav>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            const API_BASE = '/api';
            let currentUser = null;
            let currentPage = 1;
            let currentView = 'dashboard';
            let categories = [];
            let uploadedFileUrl = null;
            let localMode = false;
            let appListenersReady = false;
            let favoritesOnly = false;
            const selectedMemoryIds = new Set();

            const LOCAL_USER_KEY = 'memorylink_local_user';
            const LOCAL_MEMORIES_KEY = 'memorylink_local_memories';
            const LOCAL_DEMO_SEEDED_KEY = 'memorylink_demo_seeded';
            const LOCAL_FAVORITES_KEY = 'memorylink_favorites';
            const LOCAL_RECALL_SETTINGS_KEY = 'memorylink_recall_settings';
            const LOCAL_RECALL_NOTICE_KEY = 'memorylink_recall_notice_date';
            const LOCAL_CATEGORIES = [
                { id: 1, name: '사진', icon: '📷', color: '#3B82F6' },
                { id: 2, name: '동영상', icon: '🎥', color: '#8B5CF6' },
                { id: 3, name: '문서', icon: '📄', color: '#10B981' },
                { id: 4, name: 'SNS 게시물', icon: '💬', color: '#F59E0B' },
                { id: 5, name: '이메일', icon: '📧', color: '#EF4444' },
                { id: 6, name: '음성/통화', icon: '🎙️', color: '#EC4899' },
                { id: 7, name: '기타', icon: '📦', color: '#6B7280' }
            ];

            function getLocalMemories() {
                try {
                    return JSON.parse(localStorage.getItem(LOCAL_MEMORIES_KEY) || '[]');
                } catch {
                    return [];
                }
            }

            function saveLocalMemories(memories) {
                localStorage.setItem(LOCAL_MEMORIES_KEY, JSON.stringify(memories));
            }

            function getFavoriteIds() {
                try {
                    return new Set(JSON.parse(localStorage.getItem(LOCAL_FAVORITES_KEY) || '[]').map(String));
                } catch {
                    return new Set();
                }
            }

            function getRecallSettings() {
                try {
                    return {
                        enabled: false,
                        frequency: 'daily',
                        time: '20:00',
                        ...JSON.parse(localStorage.getItem(LOCAL_RECALL_SETTINGS_KEY) || '{}')
                    };
                } catch {
                    return { enabled: false, frequency: 'daily', time: '20:00' };
                }
            }

            function getRecallDate(memory) {
                const value = memory.original_date || memory.created_at;
                const date = new Date(value);
                return Number.isNaN(date.getTime()) ? new Date() : date;
            }

            function getRecallReason(memory, today = new Date()) {
                const memoryDate = getRecallDate(memory);
                const sameDay = memoryDate.getMonth() === today.getMonth() && memoryDate.getDate() === today.getDate();
                const years = Math.max(1, today.getFullYear() - memoryDate.getFullYear());
                if (sameDay && memoryDate.getFullYear() < today.getFullYear()) return years + '년 전 오늘의 추억';
                if (!memory.last_recalled_at) return '아직 다시 열어보지 않은 추억';
                const unseenDays = Math.floor((today - new Date(memory.last_recalled_at)) / 86400000);
                if (unseenDays >= 30) return unseenDays + '일 만에 다시 만나는 추억';
                if (Number(memory.importance_score) >= 8) return '소중하게 표시한 중요한 추억';
                if (memory.ai_sentiment === 'positive') return '기분 좋은 순간을 다시 떠올려 보세요';
                if (memory.ai_sentiment === 'negative') return '시간이 지난 지금, 천천히 돌아볼 기억';
                return '오늘의 기록과 잘 어울리는 추억';
            }

            function rankRecallMemories(memories) {
                const today = new Date();
                const daySeed = Number(String(today.getFullYear()) + String(today.getMonth() + 1) + String(today.getDate()));
                return memories.map((memory, index) => {
                    const memoryDate = getRecallDate(memory);
                    const sameDay = memoryDate.getMonth() === today.getMonth() && memoryDate.getDate() === today.getDate();
                    const lastSeen = memory.last_recalled_at ? new Date(memory.last_recalled_at) : null;
                    const unseenDays = lastSeen ? Math.max(0, Math.floor((today - lastSeen) / 86400000)) : 90;
                    const importance = Number(memory.importance_score) || 5;
                    const rotation = ((Number(memory.id) || index + 1) * 17 + daySeed) % 13;
                    return {
                        ...enrichMemory(memory),
                        recallReason: getRecallReason(memory, today),
                        recallScore: (sameDay ? 120 : 0) + importance * 7 + Math.min(unseenDays, 90) + rotation
                    };
                }).sort((a, b) => b.recallScore - a.recallScore);
            }

            function recallEmotionLabel(memory) {
                if (memory.ai_sentiment === 'positive') return '따뜻한 기억';
                if (memory.ai_sentiment === 'negative') return '돌아볼 기억';
                return '차분한 기억';
            }

            function renderRecallHub() {
                const hub = document.getElementById('recall-hub');
                if (!hub) return;
                const memories = rankRecallMemories(getLocalMemories());
                const settings = getRecallSettings();

                if (!memories.length) {
                    hub.innerHTML = \`
                        <div class="recall-empty">
                            <div><span>AI MEMORY RECALL</span><h3 id="recall-hub-title">첫 기억을 남겨주세요</h3><p>기록이 쌓이면 날짜와 감정, 중요도를 살펴 다시 만나기 좋은 순간을 골라드려요.</p></div>
                            <button type="button" onclick="showAddMemory()"><i class="fas fa-plus"></i> 추억 남기기</button>
                        </div>\`;
                    return;
                }

                const todayMemories = memories.slice(0, 3);
                const suggestions = memories.slice(3, 6);
                hub.innerHTML = \`
                    <div class="recall-collection-heading">
                        <div><span>TODAY'S COLLECTION</span><h3>오늘 다시 만날 \${todayMemories.length}개의 기억</h3></div>
                        <p>날짜와 감정, 중요도를 바탕으로 골랐어요.</p>
                    </div>
                    <div class="recall-box-grid">
                        \${todayMemories.map((memory, index) => {
                            const date = getRecallDate(memory);
                            return \`
                                <button type="button" class="recall-memory-box" onclick="openRecalledMemory(\${memory.id})">
                                    <span class="recall-memory-box-copy">
                                        <span class="recall-memory-box-top"><b>0\${index + 1}</b><em>\${memory.recallReason}</em><i class="fas fa-arrow-right"></i></span>
                                        <strong id="\${index === 0 ? 'recall-hub-title' : ''}">\${escapeHtml(memory.title)}</strong>
                                        <span class="recall-memory-summary">\${escapeHtml(memory.ai_summary || memory.description || '소중한 순간을 다시 천천히 떠올려 보세요.')}</span>
                                        <span class="recall-memory-box-meta"><span>\${memory.category_icon || '✨'} \${date.toLocaleDateString('ko-KR')}</span><span>\${recallEmotionLabel(memory)}</span><span>중요도 \${memory.importance_score || 5}</span></span>
                                    </span>
                                </button>\`;
                        }).join('')}
                    </div>

                    <div class="recall-lower-grid">
                        <div class="recall-suggestions">
                            <div class="recall-section-heading"><div><span>다음 추천</span><h4>이런 기억도 기다리고 있어요</h4></div><button type="button" onclick="refreshRecallRecommendations()" aria-label="추천 새로 고침"><i class="fas fa-rotate"></i></button></div>
                            <div class="recall-suggestion-list">
                                \${suggestions.map(memory => \`
                                    <button type="button" class="recall-suggestion" onclick="openRecalledMemory(\${memory.id})">
                                        <span class="recall-suggestion-icon">\${memory.category_icon || '✨'}</span>
                                        <span><strong>\${escapeHtml(memory.title)}</strong><small>\${memory.recallReason}</small></span>
                                        <i class="fas fa-chevron-right"></i>
                                    </button>\`).join('')}
                            </div>
                        </div>
                        <div class="recall-settings-card">
                            <span class="recall-settings-icon"><i class="fas fa-bell"></i></span>
                            <div><span>회상 알림</span><h4>잊기 전에 다시 만나요</h4><p>MemoryLink를 방문했을 때 설정한 주기에 맞춰 오늘의 기억을 알려드려요.</p></div>
                            <label class="recall-toggle"><input id="recall-enabled" type="checkbox" \${settings.enabled ? 'checked' : ''}><span></span><b>\${settings.enabled ? '켜짐' : '꺼짐'}</b></label>
                            <div class="recall-setting-row">
                                <select id="recall-frequency" aria-label="회상 알림 주기">
                                    <option value="daily" \${settings.frequency === 'daily' ? 'selected' : ''}>매일</option>
                                    <option value="weekly" \${settings.frequency === 'weekly' ? 'selected' : ''}>매주</option>
                                    <option value="monthly" \${settings.frequency === 'monthly' ? 'selected' : ''}>매월</option>
                                </select>
                                <input id="recall-time" type="time" value="\${settings.time}" aria-label="회상 알림 시간">
                                <button type="button" onclick="saveRecallSettings()">저장</button>
                            </div>
                            <small id="recall-setting-status">\${settings.enabled ? \`다음 \${settings.frequency === 'daily' ? '매일' : settings.frequency === 'weekly' ? '매주' : '매월'} \${settings.time}에 안내\` : '알림이 꺼져 있습니다'}</small>
                        </div>
                    </div>\`;
            }

            function refreshRecallRecommendations() {
                const memories = getLocalMemories();
                const current = rankRecallMemories(memories)[0];
                const index = current ? memories.findIndex(memory => String(memory.id) === String(current.id)) : -1;
                if (index >= 0) {
                    memories[index] = { ...memories[index], last_recalled_at: new Date().toISOString() };
                    saveLocalMemories(memories);
                }
                renderRecallHub();
            }

            function openRecalledMemory(id) {
                const memories = getLocalMemories();
                const index = memories.findIndex(memory => String(memory.id) === String(id));
                if (index >= 0) {
                    memories[index] = {
                        ...memories[index],
                        last_recalled_at: new Date().toISOString(),
                        recall_count: (Number(memories[index].recall_count) || 0) + 1
                    };
                    saveLocalMemories(memories);
                }
                showMemoryDetail(id);
            }

            async function saveRecallSettings() {
                const enabled = document.getElementById('recall-enabled').checked;
                const frequency = document.getElementById('recall-frequency').value;
                const time = document.getElementById('recall-time').value || '20:00';
                localStorage.setItem(LOCAL_RECALL_SETTINGS_KEY, JSON.stringify({ enabled, frequency, time }));

                const status = document.getElementById('recall-setting-status');
                if (enabled && 'Notification' in window && Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    status.textContent = permission === 'granted'
                        ? '브라우저 알림이 허용되었습니다.'
                        : '앱 안에서 오늘의 기억을 안내합니다.';
                } else {
                    status.textContent = enabled ? '회상 알림 설정을 저장했습니다.' : '회상 알림을 껐습니다.';
                }
                renderRecallHub();
                maybeShowRecallNotice();
            }

            function maybeShowRecallNotice() {
                const settings = getRecallSettings();
                if (!settings.enabled) return;
                const now = new Date();
                const todayKey = now.toISOString().slice(0, 10);
                const lastNotice = localStorage.getItem(LOCAL_RECALL_NOTICE_KEY);
                if (lastNotice === todayKey) return;
                const [hour, minute] = settings.time.split(':').map(Number);
                if (now.getHours() < hour || (now.getHours() === hour && now.getMinutes() < minute)) return;
                if (settings.frequency === 'weekly' && now.getDay() !== 0) return;
                if (settings.frequency === 'monthly' && now.getDate() !== 1) return;

                const featured = rankRecallMemories(getLocalMemories())[0];
                if (!featured) return;
                localStorage.setItem(LOCAL_RECALL_NOTICE_KEY, todayKey);
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('오늘 다시 만날 기억', { body: featured.title + ' — ' + featured.recallReason });
                }
            }

            function toggleFavorite(id, event) {
                event?.stopPropagation();
                const favorites = getFavoriteIds();
                const key = String(id);
                favorites.has(key) ? favorites.delete(key) : favorites.add(key);
                localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify([...favorites]));
                loadMemories();
            }

            function toggleFavoritesFilter() {
                favoritesOnly = !favoritesOnly;
                currentPage = 1;
                const button = document.getElementById('favorites-filter');
                button.classList.toggle('bg-amber-50', favoritesOnly);
                button.classList.toggle('text-amber-700', favoritesOnly);
                button.innerHTML = favoritesOnly
                    ? '<i class="fas fa-star mr-1"></i>즐겨찾기 전체'
                    : '<i class="far fa-star mr-1"></i>즐겨찾기만';
                loadMemories();
            }

            function toggleMemorySelection(id, event) {
                event?.stopPropagation();
                const key = String(id);
                selectedMemoryIds.has(key) ? selectedMemoryIds.delete(key) : selectedMemoryIds.add(key);
                updateBulkSelection();
            }

            function updateBulkSelection() {
                document.getElementById('selected-count').textContent = selectedMemoryIds.size;
                document.getElementById('bulk-delete-button').disabled = selectedMemoryIds.size === 0;
            }

            function removeGraduationSampleText() {
                const memories = getLocalMemories();
                let changed = false;
                const cleaned = memories.filter(memory => {
                    const isUniversityVideoSample =
                        memory.title === '대학교 생활 영상' ||
                        memory.title === '졸업식 영상' ||
                        memory.description === '대학교 생활 중 남겨둔 영상 기록' ||
                        memory.description === '대학교 졸업식 영상 기록';

                    if (isUniversityVideoSample) {
                        changed = true;
                        return false;
                    }
                    return true;
                }).map(memory => {
                    const next = { ...memory };

                    if (next.title === '졸업식 영상') {
                        next.title = '대학교 생활 영상';
                        changed = true;
                    }
                    if (next.description === '대학교 졸업식 영상 기록') {
                        next.description = '대학교 생활 중 남겨둔 영상 기록';
                        changed = true;
                    }
                    if (next.content === '4년간의 대학 생활을 마무리하는 순간') {
                        next.content = '아직 이어지고 있는 대학 생활의 소중한 순간';
                        changed = true;
                    }
                    if (next.ai_summary === '대학교 졸업식의 감동적인 순간') {
                        next.ai_summary = '대학교 생활 중 남겨둔 의미 있는 순간';
                        changed = true;
                    }
                    if (next.tags && String(next.tags).includes('졸업')) {
                        next.tags = String(next.tags).replace('"졸업", ', '').replace('졸업', '대학교 생활');
                        changed = true;
                    }

                    return next;
                });

                if (changed) {
                    saveLocalMemories(cleaned);
                }
            }

            async function hydrateLocalMemoriesFromServer() {
                if (getLocalMemories().length > 0) return;

                try {
                    const response = await axios.get(\`\${API_BASE}/memories?limit=100\`);
                    const serverMemories = response.data?.data || [];
                    if (serverMemories.length > 0) {
                        saveLocalMemories(serverMemories.map(memory => ({
                            id: memory.id,
                            title: memory.title,
                            category_id: memory.category_id,
                            description: memory.description,
                            content: memory.content,
                            file_url: memory.file_url,
                            file_type: memory.file_type,
                            importance_score: memory.importance_score || 5,
                            original_date: memory.original_date,
                            ai_summary: memory.ai_summary,
                            ai_sentiment: memory.ai_sentiment,
                            ai_keywords: memory.ai_keywords,
                            created_at: memory.created_at,
                            updated_at: memory.updated_at || memory.created_at
                        })));
                    }
                } catch (error) {
                    console.log('Local memory hydration skipped:', error.message);
                }
            }



            function escapeHtml(value) {
                return String(value || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            function safeJsonList(value) {
                if (Array.isArray(value)) return value;
                try {
                    const parsed = JSON.parse(value || '[]');
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            }

            function createLocalAIInsights(data) {
                const text = [data.title, data.description, data.content].filter(Boolean).join(' ');
                const lower = text.toLowerCase();
                const hasImage = data.file_type && data.file_type.startsWith('image');
                const positiveWords = ['\uD589\uBCF5', '\uAE30\uC068', '\uC0AC\uB791', '\uC990\uAC70', '\uAC10\uC0AC', '\uC18C\uC911', '\uC6C3\uC74C', '\uC88B', '\uCD5C\uACE0', '\uC124\uB818'];
                const negativeWords = ['슬픔', '아픔', '힘들', '그립', '외로', '걱정', '후회', '눈물', '미안', '기분 나쁘', '기분이 나빴', '불쾌', '불편', '속상', '짜증', '화남', '화가', '분노', '실망', '싫', '무서', '두려'];
                const positiveScore = positiveWords.filter(function(word) { return lower.includes(word); }).length;
                const negativeScore = negativeWords.filter(function(word) { return lower.includes(word); }).length;
                const sentiment = positiveScore > negativeScore ? 'positive' : negativeScore > positiveScore ? 'negative' : 'neutral';
                const words = Array.from(new Set(text.split(/[^0-9A-Za-z\uAC00-\uD7A3_]+/g).filter(function(word) { return word.length >= 2; }))).slice(0, 6);
                const keywords = words.length >= 3 ? words : words.concat(['\uCD94\uC5B5', '\uAE30\uB85D', '\uBCF4\uAD00']).slice(0, 6);
                const scene = lower.includes('\uC5EC\uD589') ? '\uC5EC\uD589\uACFC \uD568\uAED8\uD55C \uCD94\uC5B5'
                    : lower.includes('\uAC00\uC871') ? '\uAC00\uC871\uACFC \uD568\uAED8\uD55C \uC21C\uAC04'
                    : lower.includes('\uD559\uAD50') || lower.includes('\uB300\uD559\uAD50') ? '\uD559\uAD50 \uC0DD\uD65C \uAE30\uB85D'
                    : lower.includes('\uD3B8\uC9C0') || lower.includes('\uBB38\uC11C') ? '\uBB38\uC11C\uB85C \uB0A8\uAE34 \uAE30\uB85D'
                    : hasImage ? '\uC0AC\uC9C4\uC73C\uB85C \uB0A8\uAE34 \uC77C\uC0C1 \uC7A5\uBA74'
                    : '\uAC1C\uC778 \uCD94\uC5B5 \uAE30\uB85D';
                const atmosphere = sentiment === 'positive' ? '\uB530\uB73B\uD558\uACE0 \uBC1D\uC740 \uBD84\uC704\uAE30'
                    : sentiment === 'negative' ? '\uCC28\uBD84\uD558\uACE0 \uADF8\uB9AC\uC6C0\uC774 \uB290\uAEF4\uC9C0\uB294 \uBD84\uC704\uAE30'
                    : hasImage ? '\uC794\uC794\uD558\uACE0 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uBD84\uC704\uAE30'
                    : '\uB2F4\uBC31\uD558\uAC8C \uC815\uB9AC\uB41C \uBD84\uC704\uAE30';
                const feltEmotion = lower.includes('기분 나쁘') || lower.includes('기분이 나빴') || lower.includes('불쾌') || lower.includes('싫') ? '기분 나쁨과 불쾌함'
                    : lower.includes('불편') || lower.includes('속상') ? '불편함과 속상함'
                    : lower.includes('짜증') || lower.includes('화남') || lower.includes('화가') || lower.includes('분노') ? '화남과 답답함'
                    : lower.includes('실망') || lower.includes('후회') ? '실망과 아쉬움'
                    : lower.includes('무서') || lower.includes('두려') || lower.includes('걱정') ? '걱정과 두려움'
                    : lower.includes('설렘') ? '기분 좋은 설렘'
                    : lower.includes('편안') || lower.includes('차분') ? '편안함과 차분함'
                    : sentiment === 'positive' ? '소중함과 기분 좋은 설렘'
                    : sentiment === 'negative' ? '그리움과 아쉬움' : '편안함과 차분함';
                const firstSentence = text.split(/[.!?\u3002\uFF01\uFF1F]/)[0] || text;
                const summary = firstSentence ? (firstSentence.length > 90 ? firstSentence.slice(0, 90) + '...' : firstSentence) : '\uCD94\uC5B5\uC758 \uB0B4\uC6A9\uC744 \uBD84\uC11D\uD588\uC2B5\uB2C8\uB2E4.';

                return {
                    ai_summary: summary,
                    ai_sentiment: sentiment,
                    ai_keywords: JSON.stringify(Array.from(new Set(keywords.concat([atmosphere, feltEmotion]))).slice(0, 8)),
                    ai_scene_type: scene,
                    ai_atmosphere: atmosphere,
                    ai_felt_emotion: feltEmotion,
                    ai_image_observations: hasImage
                        ? '\uCCA8\uBD80\uB41C \uC774\uBBF8\uC9C0\uC640 \uC785\uB825\uD55C \uC124\uBA85\uC744 \uD568\uAED8 \uAE30\uC900\uC73C\uB85C \uC7A5\uBA74\uACFC \uBD84\uC704\uAE30\uB97C \uCD94\uC815\uD588\uC2B5\uB2C8\uB2E4.'
                        : '\uC774\uBBF8\uC9C0\uB294 \uC5C6\uC9C0\uB9CC \uC81C\uBAA9\uACFC \uC124\uBA85\uBB38\uC744 \uAE30\uC900\uC73C\uB85C \uC7A5\uBA74\uACFC \uAC10\uC815\uC744 \uCD94\uC815\uD588\uC2B5\uB2C8\uB2E4.',
                    ai_memory_meaning: '\uC774 \uAE30\uB85D\uC740 \uB2F9\uC2DC\uC758 \uC0C1\uD669\uACFC \uAC10\uC815\uC744 \uB2E4\uC2DC \uB5A0\uC62C\uB9B4 \uC218 \uC788\uAC8C \uD574 \uC8FC\uB294 \uAC1C\uC778\uC801\uC778 \uCD94\uC5B5 \uC790\uB8CC\uC785\uB2C8\uB2E4.',
                    ai_confidence: hasImage ? 0.62 : 0.55
                };
            }

            function createDemoMemorySamples() {
                const now = Date.now();
                const samples = [
                    {
                        title: '가족 여행 사진',
                        category_id: 1,
                        description: '2023년 여름 제주도에서 가족과 함께 남긴 사진',
                        content: '바닷가를 걷고 저녁에는 함께 밥을 먹었던 따뜻한 여행 기록입니다.',
                        file_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
                        tags: ['가족', '여행', '제주도'],
                        importance_score: 5
                    },
                    {
                        title: '할머니의 손편지',
                        category_id: 3,
                        description: '할머니께서 보내주신 짧은 손편지',
                        content: '항상 건강하고 하고 싶은 일을 천천히 해내라는 응원이 담겨 있습니다.',
                        file_url: null,
                        tags: ['편지', '가족', '응원'],
                        importance_score: 5
                    },
                    {
                        title: '친구들과 프로젝트 회의',
                        category_id: 1,
                        description: '팀원들과 아이디어를 정리하던 회의 사진',
                        content: '서로 의견을 나누며 서비스 방향을 정리했던 집중된 분위기의 기록입니다.',
                        file_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
                        tags: ['친구', '프로젝트', '회의'],
                        importance_score: 4
                    },
                    {
                        title: '반려동물 첫 만남',
                        category_id: 1,
                        description: '반려견을 처음 만난 날',
                        content: '처음에는 어색했지만 금방 가까워졌고 설레고 기분 좋은 기억으로 남았습니다.',
                        file_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80',
                        tags: ['반려동물', '첫만남', '일상'],
                        importance_score: 5
                    },
                    {
                        title: '새로운 시작을 남긴 SNS 글',
                        category_id: 4,
                        description: '새 학기 계획을 정리해서 올린 SNS 게시물',
                        content: '새로운 목표를 세우고 차근차근 해보겠다는 다짐을 기록했습니다.',
                        file_url: null,
                        tags: ['SNS', '새학기', '다짐'],
                        importance_score: 4
                    },
                    {
                        title: '불쾌했던 단체 채팅',
                        category_id: 4,
                        description: '오해가 생겨 기분이 나빴던 단체 채팅 기록',
                        content: '내 말을 끝까지 듣지 않고 오해하는 메시지가 이어져 불쾌하고 속상했습니다.',
                        file_url: null,
                        tags: ['단체채팅', '오해', '속상함'],
                        importance_score: 3
                    }
                ];

                return samples.map(function(sample, index) {
                    const createdAt = new Date(now - index * 86400000).toISOString();
                    const fileType = sample.file_url ? 'image/jpeg' : null;
                    return {
                        id: now + index + 1,
                        ...sample,
                        file_type: fileType,
                        tags: JSON.stringify(sample.tags),
                        original_date: createdAt,
                        created_at: createdAt,
                        updated_at: createdAt,
                        ...createLocalAIInsights({ ...sample, file_type: fileType })
                    };
                });
            }

            function ensureDemoMemories() {
                const demoAlreadySeeded = localStorage.getItem(LOCAL_DEMO_SEEDED_KEY) === '1';
                const existing = getLocalMemories();
                if (demoAlreadySeeded && existing.length >= 6) return;
                if (existing.length >= 6) {
                    localStorage.setItem(LOCAL_DEMO_SEEDED_KEY, '1');
                    return;
                }

                const existingTitles = new Set(existing.map(function(memory) { return memory.title; }));
                const missingSamples = createDemoMemorySamples()
                    .filter(function(memory) { return !existingTitles.has(memory.title); })
                    .slice(0, 6 - existing.length);

                if (missingSamples.length > 0) {
                    saveLocalMemories(existing.concat(missingSamples));
                }
                localStorage.setItem(LOCAL_DEMO_SEEDED_KEY, '1');
            }
            function aiInsightCard(color, icon, title, body) {
                if (!body) return '';
                return '<div class="bg-' + color + '-50 p-4 rounded-lg border border-' + color + '-100">' +
                    '<h4 class="text-sm font-semibold text-' + color + '-900 mb-2"><i class="fas ' + icon + ' mr-2"></i>' + title + '</h4>' +
                    '<p class="text-' + color + '-800 text-sm">' + escapeHtml(body) + '</p>' +
                    '</div>';
            }

            function getEmotionPresentation(memory) {
                const detail = String(memory.ai_felt_emotion || '').trim();
                const sentiment = memory.ai_sentiment || 'neutral';
                const source = detail + ' ' + String(memory.ai_atmosphere || '');
                let label = sentiment === 'positive' ? '행복' : sentiment === 'negative' ? '그리움' : '차분함';
                let emoji = sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😢' : '😌';

                const emotionRules = [
                    ['설렘', '설렘', '✨'], ['사랑', '사랑', '🥰'], ['소중', '소중함', '💛'],
                    ['행복', '행복', '😊'], ['기쁨', '기쁨', '😄'], ['뿌듯', '뿌듯함', '🌟'],
                    ['기분 나쁨', '기분 나쁨', '😣'], ['불쾌', '불쾌함', '😖'], ['화남', '화남', '😠'],
                    ['분노', '분노', '😡'], ['짜증', '짜증', '😤'], ['실망', '실망', '😞'], ['불편', '불편함', '😕'], ['속상', '속상함', '😥'],
                    ['두려움', '두려움', '😨'], ['그리움', '그리움', '🥹'], ['아쉬움', '아쉬움', '😔'],
                    ['슬픔', '슬픔', '😢'], ['걱정', '걱정', '😟'], ['편안', '편안함', '😌'], ['차분', '차분함', '🌿']
                ];
                emotionRules.some(function(rule) {
                    if (!source.includes(rule[0])) return false;
                    label = rule[1]; emoji = rule[2]; return true;
                });

                const confidence = Math.round(Math.max(0, Math.min(1, Number(memory.ai_confidence) || 0.55)) * 100);
                return { label, emoji, detail: detail || label + '이 느껴지는 추억', sentiment, confidence };
            }

            function renderEmotionPill(memory) {
                if (!memory.ai_sentiment && !memory.ai_felt_emotion) return '';
                const emotion = getEmotionPresentation(memory);
                return '<div class="memory-emotion-pill emotion-' + emotion.sentiment + '" title="AI 감정 분석: ' + escapeHtml(emotion.detail) + '">' +
                    '<span aria-hidden="true">' + emotion.emoji + '</span><span>AI 감정 · ' + escapeHtml(emotion.label) + '</span>' +
                '</div>';
            }

            function renderEmotionSpotlight(memory) {
                if (!memory.ai_sentiment && !memory.ai_felt_emotion) return '';
                const emotion = getEmotionPresentation(memory);
                return '<section class="ai-emotion-spotlight emotion-' + emotion.sentiment + '" aria-label="AI 감정 분석 결과">' +
                    '<div class="ai-emotion-heading"><span class="ai-emotion-eyebrow"><i class="fas fa-brain"></i> AI 감정 분석</span><span class="ai-emotion-confidence">확신도 ' + emotion.confidence + '%</span></div>' +
                    '<div class="ai-emotion-result"><span class="ai-emotion-emoji" aria-hidden="true">' + emotion.emoji + '</span><div><p class="ai-emotion-label">' + escapeHtml(emotion.label) + '</p><p class="ai-emotion-detail">' + escapeHtml(emotion.detail) + '</p></div></div>' +
                    '<div class="ai-emotion-meter" aria-label="분석 확신도 ' + emotion.confidence + '%"><span style="width:' + emotion.confidence + '%"></span></div>' +
                    '<p class="ai-emotion-basis"><strong>판단 근거</strong> ' + escapeHtml(memory.ai_atmosphere || memory.ai_image_observations || '기록의 제목과 설명에서 느껴지는 표현을 분석했습니다.') + '</p>' +
                '</section>';
            }

            function renderAIInsightBlocks(memory) {
                const hasInsight = memory.ai_scene_type || memory.ai_atmosphere || memory.ai_felt_emotion || memory.ai_image_observations || memory.ai_memory_meaning;
                if (!hasInsight) return '';

                const topCards = [
                    aiInsightCard('indigo', 'fa-image', 'AI \uC7A5\uBA74 \uD310\uBCC4', memory.ai_scene_type),
                    aiInsightCard('amber', 'fa-sun', '\uBD84\uC704\uAE30', memory.ai_atmosphere),
                    aiInsightCard('rose', 'fa-heart', '\uB290\uAEF4\uC9C0\uB294 \uAE30\uBD84', memory.ai_felt_emotion)
                ].join('');

                const observation = memory.ai_image_observations
                    ? '<div class="bg-slate-50 p-4 rounded-lg border border-slate-100">' +
                        '<h4 class="text-sm font-semibold text-slate-900 mb-2"><i class="fas fa-eye mr-2"></i>AI \uC774\uBBF8\uC9C0/\uC124\uBA85 \uAD00\uCC30</h4>' +
                        '<p class="text-slate-700 text-sm">' + escapeHtml(memory.ai_image_observations) + '</p>' +
                    '</div>'
                    : '';

                const confidence = memory.ai_confidence
                    ? '<p class="text-xs text-emerald-600 mt-2">\uBD84\uC11D \uC2E0\uB8B0\uB3C4 ' + Math.round(Number(memory.ai_confidence) * 100) + '%</p>'
                    : '';
                const meaning = memory.ai_memory_meaning
                    ? '<div class="bg-emerald-50 p-4 rounded-lg border border-emerald-100">' +
                        '<h4 class="text-sm font-semibold text-emerald-900 mb-2"><i class="fas fa-seedling mr-2"></i>\uCD94\uC5B5 \uC758\uBBF8</h4>' +
                        '<p class="text-emerald-800 text-sm">' + escapeHtml(memory.ai_memory_meaning) + '</p>' +
                        confidence +
                    '</div>'
                    : '';

                return '<div class="grid grid-cols-1 md:grid-cols-3 gap-3">' + topCards + '</div>' + observation + meaning;
            }

            function enrichMemory(memory) {
                if (!memory) return null;
                const category = LOCAL_CATEGORIES.find(cat => cat.id === Number(memory.category_id));
                return {
                    ...memory,
                    category_name: category?.name || '미분류',
                    category_icon: category?.icon || '✨',
                    category_color: category?.color || '#6B7280',
                    connections: memory.connections || []
                };
            }

            function getLocalStats() {
                const memories = getLocalMemories().map(enrichMemory);
                const byCategory = LOCAL_CATEGORIES.map(cat => ({
                    ...cat,
                    count: memories.filter(memory => Number(memory.category_id) === cat.id).length
                })).sort((a, b) => b.count - a.count);

                const sentimentCounts = memories.reduce((acc, memory) => {
                    const key = memory.ai_sentiment || 'neutral';
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});

                return {
                    total: memories.length,
                    byCategory,
                    recent: memories.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
                    sentiments: Object.entries(sentimentCounts).map(([ai_sentiment, count]) => ({ ai_sentiment, count })),
                    importance: Array.from({ length: 10 }, (_, index) => ({
                        score: index + 1,
                        count: memories.filter(memory => Math.round(Number(memory.importance_score) || 5) === index + 1).length
                    }))
                };
            }

            function getLocalPage() {
                const category = document.getElementById('category-filter').value;
                const search = document.getElementById('search-input').value.trim().toLowerCase();
                const sort = document.getElementById('sort-filter').value;
                const emotion = document.getElementById('emotion-filter').value;
                const favoriteIds = getFavoriteIds();
                const limit = 12;
                let data = getLocalMemories().map(enrichMemory);

                if (category) {
                    data = data.filter(memory => Number(memory.category_id) === Number(category));
                }
                if (search) {
                    data = data.filter(memory =>
                        [memory.title, memory.description, memory.content, ...safeJsonList(memory.tags)].some(value =>
                            String(value || '').toLowerCase().includes(search)
                        )
                    );
                }

                if (favoritesOnly) {
                    data = data.filter(memory => favoriteIds.has(String(memory.id)));
                }
                if (emotion) {
                    data = data.filter(memory => String(memory.ai_sentiment || 'neutral') === emotion);
                }

                const dateOf = memory => new Date(memory.original_date || memory.created_at || 0).getTime();
                data.sort((a, b) => {
                    if (sort === 'oldest') return dateOf(a) - dateOf(b);
                    if (sort === 'importance') return Number(b.importance_score || 0) - Number(a.importance_score || 0) || dateOf(b) - dateOf(a);
                    if (sort === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'ko');
                    return dateOf(b) - dateOf(a);
                });
                const total = data.length;
                const start = (currentPage - 1) * limit;
                return {
                    data: data.slice(start, start + limit),
                    pagination: {
                        page: currentPage,
                        limit,
                        total,
                        totalPages: Math.max(1, Math.ceil(total / limit))
                    }
                };
            }

            function renderCategoryChips() {
                const chips = document.getElementById('category-chips');
                if (!chips) return;

                const selected = document.getElementById('category-filter').value;
                const memories = getLocalMemories();
                const countByCategory = LOCAL_CATEGORIES.reduce((acc, cat) => {
                    acc[cat.id] = memories.filter(memory => Number(memory.category_id) === cat.id).length;
                    return acc;
                }, {});

                const allActive = selected === '';
                chips.innerHTML = \`
                    <button type="button" onclick="selectCategoryFilter('')" class="px-4 py-2 rounded-full text-sm font-semibold transition \${allActive ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300'}">
                        전체 \${memories.length}
                    </button>
                    \${LOCAL_CATEGORIES.map(cat => {
                        const active = String(selected) === String(cat.id);
                        return \`
                            <button type="button" onclick="selectCategoryFilter('\${cat.id}')" class="px-4 py-2 rounded-full text-sm font-semibold transition \${active ? 'text-white shadow' : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300'}" style="\${active ? \`background-color: \${cat.color}\` : ''}">
                                \${cat.icon} \${cat.name} \${countByCategory[cat.id] || 0}
                            </button>
                        \`;
                    }).join('')}
                \`;
            }

            function selectCategoryFilter(categoryId) {
                document.getElementById('category-filter').value = categoryId;
                currentPage = 1;
                renderCategoryChips();
                loadMemories();
            }

            function openCategoryBox(categoryId) {
                document.getElementById('category-filter').value = categoryId || '';
                currentPage = 1;
                showView('memories');
                renderCategoryChips();
                loadMemories();
            }

            function saveLocalMemory(data, id = null) {
                const memories = getLocalMemories();
                const now = new Date().toISOString();
                const memoryData = data.auto_analyze ? { ...data, ...createLocalAIInsights(data) } : data;

                if (id) {
                    const index = memories.findIndex(memory => String(memory.id) === String(id));
                    if (index !== -1) {
                        memories[index] = { ...memories[index], ...memoryData, updated_at: now };
                        saveLocalMemories(memories);
                        return enrichMemory(memories[index]);
                    }
                }

                const memory = {
                    id: Date.now(),
                    ...memoryData,
                    created_at: now,
                    updated_at: now
                };
                memories.unshift(memory);
                saveLocalMemories(memories);
                return enrichMemory(memory);
            }

            function deleteLocalMemory(id) {
                saveLocalMemories(getLocalMemories().filter(memory => String(memory.id) !== String(id)));
            }

            // ==================== Auth Functions ====================
            
            async function checkAuth() {
                try {
                    const response = await axios.get(\`\${API_BASE}/auth/me\`);
                    currentUser = response.data.user;
                    localMode = true;
                    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(currentUser));
                    showMainApp();
                } catch (error) {
                    const localUser = localStorage.getItem(LOCAL_USER_KEY);
                    if (localUser) {
                        localMode = true;
                        currentUser = JSON.parse(localUser);
                        showMainApp();
                    } else {
                        showAuthContainer();
                    }
                }
            }

            function showAuthContainer() {
                document.getElementById('auth-container').classList.remove('hidden');
                document.getElementById('main-app').classList.add('hidden');
            }

            function showMainApp() {
                document.getElementById('auth-container').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                const safeUser = currentUser || {
                    name: '사용자',
                    avatar_url: 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff'
                };
                document.getElementById('user-name').textContent = safeUser.name || '사용자';
                document.getElementById('user-avatar').src = safeUser.avatar_url || 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff';
                init().catch((error) => {
                    console.error('App init failed:', error);
                    localMode = true;
                    renderCategoryChips();
                    loadStatistics().catch(() => {});
                    showView('dashboard');
                });
            }

            function showLogin() {
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('auth-title').dataset.mode = 'login';
                document.getElementById('auth-title').setAttribute('aria-label', 'MemoryLink 로그인');
                document.getElementById('login-email').focus();
            }

            function showRegister() {
                document.getElementById('login-form').classList.add('hidden');
                document.getElementById('register-form').classList.remove('hidden');
                document.getElementById('register-success-message').classList.add('hidden');
                document.getElementById('auth-title').dataset.mode = 'register';
                document.getElementById('auth-title').setAttribute('aria-label', 'MemoryLink 회원가입');
                document.getElementById('register-name').focus();
            }

            function togglePasswordVisibility(inputId, iconId) {
                const input = document.getElementById(inputId);
                const icon = document.getElementById(iconId);
                const isHidden = input.type === 'password';

                input.type = isHidden ? 'text' : 'password';
                icon.classList.toggle('fa-eye', !isHidden);
                icon.classList.toggle('fa-eye-slash', isHidden);
            }

            function showLoginAfterRegister(email) {
                showLogin();
                document.getElementById('login-email').value = email;
                document.getElementById('login-password').value = '';
                document.getElementById('register-submit').reset();
                document.getElementById('register-success-message').classList.remove('hidden');
            }

            if (new URLSearchParams(window.location.search).get('auth') === 'register') {
                showRegister();
            }

            document.getElementById('login-submit').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;

                try {
                    const response = await axios.post(\`\${API_BASE}/auth/login\`, { email, password });
                    currentUser = response.data.user;
                    localMode = true;
                    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(currentUser));
                    showMainApp();
                } catch (error) {
                    localMode = true;
                    currentUser = {
                        id: 'local-user',
                        email,
                        name: email.split('@')[0] || '사용자',
                        avatar_url: \`https://ui-avatars.com/api/?name=\${encodeURIComponent(email.split('@')[0] || 'User')}&background=667eea&color=fff\`
                    };
                    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(currentUser));
                    showMainApp();
                }
            });

            document.getElementById('register-submit').addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('register-name').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;

                try {
                    await axios.post(\`\${API_BASE}/auth/register\`, { name, email, password });
                    await axios.post(\`\${API_BASE}/auth/logout\`).catch(() => {});
                    currentUser = null;
                    localMode = false;
                    localStorage.removeItem(LOCAL_USER_KEY);
                    showLoginAfterRegister(email);
                } catch (error) {
                    currentUser = null;
                    localMode = true;
                    localStorage.removeItem(LOCAL_USER_KEY);
                    showLoginAfterRegister(email);
                }
            });

            async function logout() {
                if (!confirm('로그아웃 하시겠습니까?')) return;
                
                try {
                    await axios.post(\`\${API_BASE}/auth/logout\`);
                    localStorage.removeItem(LOCAL_USER_KEY);
                    currentUser = null;
                    localMode = false;
                    showAuthContainer();
                } catch (error) {
                    localStorage.removeItem(LOCAL_USER_KEY);
                    currentUser = null;
                    localMode = false;
                    showAuthContainer();
                }
            }

            // ==================== App Init ====================
            
            async function init() {
                localMode = true;
                await loadCategories();
                await hydrateLocalMemoriesFromServer();
                removeGraduationSampleText();
                ensureDemoMemories();
                await loadStatistics();
                showView('dashboard');
                setupEventListeners();
            }

            function setupEventListeners() {
                if (appListenersReady) return;
                appListenersReady = true;

                document.getElementById('category-filter').addEventListener('change', () => {
                    currentPage = 1;
                    renderCategoryChips();
                    loadMemories();
                });

                document.getElementById('sort-filter').addEventListener('change', () => {
                    currentPage = 1;
                    loadMemories();
                });

                document.getElementById('emotion-filter').addEventListener('change', () => {
                    currentPage = 1;
                    loadMemories();
                });

                document.getElementById('import-input').addEventListener('change', importData);
                
                document.getElementById('search-input').addEventListener('input', debounce(() => {
                    currentPage = 1;
                    loadMemories();
                }, 500));
                
                document.getElementById('importance-score').addEventListener('input', (e) => {
                    document.getElementById('importance-value').textContent = e.target.value;
                });
                
                document.getElementById('memory-form').addEventListener('submit', handleMemorySubmit);
                
                const uploadArea = document.getElementById('upload-area');
                const fileInput = document.getElementById('file-input');
                
                uploadArea.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', handleFileSelect);
                
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('dragover');
                });
                
                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('dragover');
                });
                
                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('dragover');
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        fileInput.files = files;
                        handleFileSelect({ target: fileInput });
                    }
                });
                
                // 스크린샷 붙여넣기 지원
                document.addEventListener('paste', handlePaste);
            }
            
            async function handlePaste(e) {
                // 모달이 열려있을 때만 작동
                const modal = document.getElementById('memory-modal');
                if (modal.classList.contains('hidden')) return;
                
                const items = e.clipboardData?.items;
                if (!items) return;
                
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        e.preventDefault();
                        const file = items[i].getAsFile();
                        if (file) {
                            // File input에 파일 설정
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            document.getElementById('file-input').files = dataTransfer.files;
                            
                            // 파일 처리
                            await handleFileSelect({ target: { files: [file] } });
                        }
                        break;
                    }
                }
            }

            async function handleFileSelect(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const preview = document.getElementById('file-preview');
                const maxSize = 10 * 1024 * 1024; // 10MB
                
                if (file.size > maxSize) {
                    preview.innerHTML = \`
                        <div class="p-3 bg-red-50 rounded-lg border border-red-200">
                            <p class="text-sm text-red-800">
                                <i class="fas fa-exclamation-circle"></i>
                                파일 크기가 너무 큽니다 (최대 10MB)
                            </p>
                        </div>
                    \`;
                    return;
                }
                
                preview.innerHTML = \`
                    <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-spinner fa-spin text-blue-600"></i>
                            <span class="text-sm text-blue-700">\${file.name} 처리 중...</span>
                        </div>
                        <span class="text-xs text-blue-500">\${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                \`;
                
                // 이미지를 Base64로 변환하여 직접 저장
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        uploadedFileUrl = e.target.result; // Base64 data URL
                        document.getElementById('file-url').value = uploadedFileUrl;
                        
                        preview.innerHTML = \`
                            <div class="p-3 bg-green-50 rounded-lg border border-green-200">
                                <div class="flex items-center space-x-2 mb-2">
                                    <i class="fas fa-check-circle text-green-600"></i>
                                    <span class="text-sm text-green-700">이미지 준비 완료!</span>
                                </div>
                                <img src="\${e.target.result}" class="rounded-lg max-h-48 object-cover w-full">
                            </div>
                        \`;
                    };
                    reader.onerror = () => {
                        preview.innerHTML = \`
                            <div class="p-3 bg-red-50 rounded-lg border border-red-200">
                                <p class="text-sm text-red-800">
                                    <i class="fas fa-exclamation-circle"></i>
                                    파일 읽기 실패
                                </p>
                            </div>
                        \`;
                    };
                    reader.readAsDataURL(file);
                    return;
                }
                
                // R2 업로드 시도 (동영상 등)
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    const response = await axios.post(\`\${API_BASE}/upload\`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    
                    uploadedFileUrl = response.data.url;
                    document.getElementById('file-url').value = uploadedFileUrl;
                    
                    preview.innerHTML = \`
                        <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                            <div class="flex items-center space-x-2">
                                <i class="fas fa-check-circle text-green-600"></i>
                                <span class="text-sm text-green-700">업로드 완료!</span>
                            </div>
                        </div>
                    \`;
                } catch (error) {
                    console.log('R2 업로드 실패:', error.response?.data?.error);
                    preview.innerHTML = \`
                        <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p class="text-sm text-yellow-800">
                                <i class="fas fa-exclamation-triangle"></i>
                                R2 업로드 불가 (버킷 미설정)
                            </p>
                            <p class="text-xs text-yellow-700 mt-1">
                                아래 URL 입력란에 외부 URL을 입력하세요
                            </p>
                        </div>
                    \`;
                }
            }

            async function loadCategories() {
                try {
                    const response = await axios.get(\`\${API_BASE}/categories\`);
                    categories = response.data;
                    
                    const categorySelect = document.getElementById('category');
                    const categoryFilter = document.getElementById('category-filter');
                    categorySelect.innerHTML = '<option value="">선택하세요</option>';
                    categoryFilter.innerHTML = '<option value="">모든 카테고리</option>';
                    
                    categories.forEach(cat => {
                        const option = new Option(\`\${cat.icon} \${cat.name}\`, cat.id);
                        categorySelect.add(option.cloneNode(true));
                        categoryFilter.add(option);
                    });
                } catch (error) {
                    console.error('Error loading categories:', error);
                    categories = LOCAL_CATEGORIES;
                    const categorySelect = document.getElementById('category');
                    const categoryFilter = document.getElementById('category-filter');

                    categorySelect.innerHTML = '<option value="">선택하세요</option>';
                    categoryFilter.innerHTML = '<option value="">모든 카테고리</option>';
                    categories.forEach(cat => {
                        const option = new Option(\`\${cat.icon} \${cat.name}\`, cat.id);
                        categorySelect.add(option.cloneNode(true));
                        categoryFilter.add(option);
                    });
                }
            }

            function renderCollectionStatus(stats) {
                const categoriesChart = document.getElementById('categories-chart');
                const categoryStats = stats.byCategory || [];
                const activeCategories = categoryStats.filter(cat => Number(cat.count) > 0);
                const emptyCategories = categoryStats.filter(cat => Number(cat.count) === 0);
                const topCategory = activeCategories[0];
                const total = Number(stats.total) || 0;
                const topShare = topCategory && total ? Math.round((Number(topCategory.count) / total) * 100) : 0;
                const emptyVaultCount = total === 0 ? 0 : emptyCategories.length;

                categoriesChart.innerHTML = \`
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div class="lg:col-span-2 p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white">
                            <p class="text-sm text-slate-200">가장 많이 남긴 기록</p>
                            <div class="flex items-center gap-3 mt-3">
                                <span class="text-4xl">\${topCategory?.icon || '✨'}</span>
                                <div>
                                    <p class="text-2xl font-bold">\${topCategory?.name || '아직 기록 없음'}</p>
                                    <p class="text-sm text-slate-300 mt-1">\${topCategory ? \`\${topCategory.count}개 · 전체의 \${topShare}%\` : '첫 기록을 추가하면 현황이 채워집니다'}</p>
                                </div>
                            </div>
                        </div>
                        <div onclick="openCategoryBox('\${emptyCategories[0]?.id || ''}')" role="button" tabindex="0" class="w-full text-left p-5 rounded-xl bg-gray-50 border border-gray-100 hover:border-purple-300 hover:shadow-sm transition cursor-pointer">
                            <p class="text-sm text-gray-500">\${total === 0 ? '현재 저장된 보관함' : '비어있는 보관함'}</p>
                            <p class="text-3xl font-bold text-gray-900 mt-2">\${emptyVaultCount}</p>
                            <div class="mt-4 flex flex-wrap gap-2">
                                \${emptyCategories.length ? emptyCategories.slice(0, 4).map(cat => \`
                                    <button onclick="event.stopPropagation(); openCategoryBox('\${cat.id}')" class="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-700 hover:border-purple-300 hover:text-purple-700 transition">
                                        \${cat.icon} \${cat.name}
                                    </button>
                                \`).join('') : '<span class="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-sm font-semibold">모든 유형에 기록이 있습니다</span>'}
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div class="p-4 rounded-xl bg-purple-50"><p class="text-sm text-purple-700">전체 기록</p><p class="text-2xl font-bold text-purple-900 mt-1">\${total}</p></div>
                        <div class="p-4 rounded-xl bg-blue-50"><p class="text-sm text-blue-700">채워진 유형</p><p class="text-2xl font-bold text-blue-900 mt-1">\${activeCategories.length}</p></div>
                        <div class="p-4 rounded-xl bg-emerald-50"><p class="text-sm text-emerald-700">최근 기록</p><p class="text-2xl font-bold text-emerald-900 mt-1">\${stats.recent?.length || 0}</p></div>
                        <div class="p-4 rounded-xl bg-amber-50"><p class="text-sm text-amber-700">다음 추천</p><p class="text-lg font-bold text-amber-900 mt-2 truncate">\${emptyCategories[0]?.name || '추억 정리'}</p></div>
                    </div>
                \`;

                const recentMemories = document.getElementById('recent-memories');
                recentMemories.innerHTML = stats.recent.length ? stats.recent.map(memory => \`
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition" onclick="showMemoryDetail(\${memory.id})">
                        <div class="flex items-center space-x-3">
                            \${memory.file_url && memory.file_type?.startsWith('image') ?
                                \`<img src="\${memory.file_url}" class="w-12 h-12 rounded-lg object-cover">\` :
                                \`<span class="text-xl">\${memory.category_icon || '📦'}</span>\`
                            }
                            <div>
                                <p class="font-medium text-gray-900">\${memory.title}</p>
                                <p class="text-xs text-gray-500">\${new Date(memory.created_at).toLocaleDateString('ko-KR')}</p>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </div>
                \`).join('') : '<div class="p-4 bg-gray-50 rounded-lg text-sm text-gray-500">아직 추가된 기록이 없습니다.</div>';
            }

            async function loadStatistics() {
                try {
                    renderRecallHub();
                    maybeShowRecallNotice();
                    const stats = localMode ? getLocalStats() : (await axios.get(\`\${API_BASE}/statistics\`)).data;
                    
                    document.getElementById('total-memories').textContent = stats.total;
                    
                    const sentiments = stats.sentiments.reduce((acc, s) => {
                        acc[s.ai_sentiment] = s.count;
                        return acc;
                    }, {});
                    document.getElementById('positive-memories').textContent = sentiments.positive || 0;
                    document.getElementById('neutral-memories').textContent = sentiments.neutral || 0;
                    const importance = normalizeImportanceStats(stats.importance);
                    const importanceTotal = importance.reduce((sum, item) => sum + item.count, 0);
                    const importanceSum = importance.reduce((sum, item) => sum + (item.score * item.count), 0);
                    document.getElementById('avg-importance').textContent = importanceTotal ? (importanceSum / importanceTotal).toFixed(1) : '0';
                    
                    const categoriesChart = document.getElementById('categories-chart');
                    const categoryStats = stats.byCategory || [];
                    const activeCategories = categoryStats.filter(cat => Number(cat.count) > 0);
                    const emptyCategories = categoryStats.filter(cat => Number(cat.count) === 0);
                    const topCategory = activeCategories[0];
                    const total = Number(stats.total) || 0;
                    const topShare = topCategory && total ? Math.round((Number(topCategory.count) / total) * 100) : 0;
                    const nextCategories = activeCategories.slice(1, 4);
                    const emptyVaultCount = total === 0 ? 0 : emptyCategories.length;

                    categoriesChart.innerHTML = \`
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div class="lg:col-span-2 p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white">
                                <div class="flex items-start justify-between gap-4">
                                    <div>
                                        <p class="text-sm text-slate-200">가장 많이 남긴 기록</p>
                                        <div class="flex items-center gap-3 mt-3">
                                            <span class="text-4xl">\${topCategory?.icon || '✨'}</span>
                                            <div>
                                                <p class="text-2xl font-bold">\${topCategory?.name || '아직 기록 없음'}</p>
                                                <p class="text-sm text-slate-300 mt-1">\${topCategory ? \`\${topCategory.count}개 · 전체의 \${topShare}%\` : '첫 기록을 추가하면 현황이 채워집니다'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button onclick="openCategoryBox('')" class="shrink-0 w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition" title="전체 보관함 보기">
                                        <i class="fas fa-arrow-right"></i>
                                    </button>
                                </div>
                                <div class="mt-5 grid grid-cols-3 gap-2">
                                    \${nextCategories.length ? nextCategories.map(cat => \`
                                        <button onclick="openCategoryBox('\${cat.id}')" class="text-left rounded-lg bg-white/10 hover:bg-white/20 p-3 transition">
                                            <p class="text-2xl mb-1">\${cat.icon}</p>
                                            <p class="text-sm font-semibold truncate">\${cat.name}</p>
                                            <p class="text-xs text-slate-300">\${cat.count}개</p>
                                        </button>
                                    \`).join('') : \`
                                        <div class="col-span-3 rounded-lg bg-white/10 p-3 text-sm text-slate-200">
                                            사진, 문서, SNS 등 다양한 기록을 추가해보세요.
                                        </div>
                                    \`}
                                </div>
                            </div>

                            <div onclick="openCategoryBox('\${emptyCategories[0]?.id || ''}')" role="button" tabindex="0" class="w-full text-left p-5 rounded-xl bg-gray-50 border border-gray-100 hover:border-purple-300 hover:shadow-sm transition cursor-pointer">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-500">\${total === 0 ? '현재 저장된 보관함' : '비어있는 보관함'}</p>
                                        <p class="text-3xl font-bold text-gray-900 mt-2">\${emptyVaultCount}</p>
                                    </div>
                                    <span class="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-purple-600 shadow-sm">
                                        <i class="fas fa-inbox text-xl"></i>
                                    </span>
                                </div>
                                <div class="mt-4 flex flex-wrap gap-2">
                                    \${emptyCategories.length ? emptyCategories.slice(0, 4).map(cat => \`
                                        <button onclick="event.stopPropagation(); openCategoryBox('\${cat.id}')" class="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-700 hover:border-purple-300 hover:text-purple-700 transition">
                                            \${cat.icon} \${cat.name}
                                        </button>
                                    \`).join('') : \`
                                        <span class="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-sm font-semibold">
                                            모든 유형에 기록이 있습니다
                                        </span>
                                    \`}
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div class="p-4 rounded-xl bg-purple-50">
                                <p class="text-sm text-purple-700">전체 기록</p>
                                <p class="text-2xl font-bold text-purple-900 mt-1">\${total}</p>
                            </div>
                            <div class="p-4 rounded-xl bg-blue-50">
                                <p class="text-sm text-blue-700">채워진 유형</p>
                                <p class="text-2xl font-bold text-blue-900 mt-1">\${activeCategories.length}</p>
                            </div>
                            <div class="p-4 rounded-xl bg-emerald-50">
                                <p class="text-sm text-emerald-700">최근 기록</p>
                                <p class="text-2xl font-bold text-emerald-900 mt-1">\${stats.recent?.length || 0}</p>
                            </div>
                            <div class="p-4 rounded-xl bg-amber-50">
                                <p class="text-sm text-amber-700">다음 추천</p>
                                <p class="text-lg font-bold text-amber-900 mt-2 truncate">\${emptyCategories[0]?.name || '추억 정리'}</p>
                            </div>
                        </div>
                    \`;
                    
                    const recentMemories = document.getElementById('recent-memories');
                    recentMemories.innerHTML = stats.recent.map(memory => \`
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition" onclick="showMemoryDetail(\${memory.id})">
                            <div class="flex items-center space-x-3">
                                \${memory.file_url && memory.file_type?.startsWith('image') ? 
                                    \`<img src="\${memory.file_url}" class="w-12 h-12 rounded-lg object-cover">\` :
                                    \`<span class="text-xl">\${memory.category_icon || '📦'}</span>\`
                                }
                                <div>
                                    <p class="font-medium text-gray-900">\${memory.title}</p>
                                    <p class="text-xs text-gray-500">\${new Date(memory.created_at).toLocaleDateString('ko-KR')}</p>
                                </div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                    \`).join('');
                } catch (error) {
                    console.error('Error loading statistics:', error);
                    localMode = true;
                    const stats = getLocalStats();
                    document.getElementById('total-memories').textContent = stats.total;
                    document.getElementById('positive-memories').textContent = 0;
                    document.getElementById('neutral-memories').textContent = 0;
                    renderCollectionStatus(stats);
                }
            }

            function renderMemoryCards(data, pagination) {
                const grid = document.getElementById('memories-grid');
                const favoriteIds = getFavoriteIds();
                grid.innerHTML = data.length ? data.map(memory => \`
                    <div class="memory-card relative bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer" onclick="showMemoryDetail(\${memory.id})">
                        <label class="absolute top-3 left-3 z-10 w-9 h-9 rounded-full bg-white/95 shadow flex items-center justify-center cursor-pointer" title="선택" onclick="event.stopPropagation()">
                            <input type="checkbox" class="w-4 h-4 accent-purple-600" \${selectedMemoryIds.has(String(memory.id)) ? 'checked' : ''} onchange="toggleMemorySelection(\${memory.id}, event)">
                        </label>
                        <button type="button" onclick="toggleFavorite(\${memory.id}, event)" class="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 shadow text-amber-500 hover:scale-110 transition" aria-label="즐겨찾기 전환">
                            <i class="\${favoriteIds.has(String(memory.id)) ? 'fas' : 'far'} fa-star"></i>
                        </button>
                        \${memory.file_url ?
                            (memory.file_type?.startsWith('image') ?
                                \`<img src="\${memory.file_url}" alt="\${memory.title}" onerror="this.src='https://via.placeholder.com/400x200?text=이미지+로드+실패'">\` :
                                \`<div class="w-full h-48 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                                    <i class="fas fa-video text-white text-4xl"></i>
                                </div>\`
                            ) :
                            \`<div class="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <span class="text-6xl">\${memory.category_icon || '📦'}</span>
                            </div>\`
                        }
                        <div class="p-4">
                            <div class="flex items-start justify-between mb-2">
                                <h3 class="text-lg font-bold text-gray-900 flex-1">\${memory.title}</h3>
                                <div class="flex items-center space-x-1 ml-2">
                                    \${Array(Math.min(memory.importance_score || 5, 5)).fill('<i class="fas fa-star text-yellow-400 text-xs"></i>').join('')}
                                </div>
                            </div>
                            <p class="text-sm text-gray-600 mb-3 line-clamp-2">\${memory.description || memory.ai_summary || ''}</p>
                            \${renderEmotionPill(memory)}
                            \${safeJsonList(memory.tags).length ? \`
                                <div class="flex flex-wrap gap-1 mb-3">
                                    \${safeJsonList(memory.tags).slice(0, 3).map(tag => \`<span class="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">#\${escapeHtml(tag)}</span>\`).join('')}
                                </div>
                            \` : ''}
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-gray-500">\${new Date(memory.created_at).toLocaleDateString('ko-KR')}</span>
                                <span class="category-badge px-2 py-1 rounded-full text-xs" style="background-color: \${memory.category_color}20; color: \${memory.category_color}">
                                    \${memory.category_name || '미분류'}
                                </span>
                            </div>
                            <div class="memory-card-actions" onclick="event.stopPropagation()">
                                <button type="button" class="memory-icon-button memory-edit-button" onclick="editMemory(\${memory.id})" aria-label="\${escapeHtml(memory.title)} 수정" title="수정">
                                    <i class="fas fa-edit" aria-hidden="true"></i>
                                </button>
                                <button type="button" class="memory-icon-button memory-duplicate-button" onclick="duplicateMemory(\${memory.id})" aria-label="\${escapeHtml(memory.title)} 복제" title="복제">
                                    <i class="fas fa-copy" aria-hidden="true"></i>
                                </button>
                                <button type="button" class="memory-icon-button memory-delete-button" onclick="deleteMemory(\${memory.id})" aria-label="\${escapeHtml(memory.title)} 삭제" title="삭제">
                                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                \`).join('') : \`
                    <div onclick="showAddMemory()" class="add-memory-card p-8 rounded-xl text-white text-center cursor-pointer">
                        <i class="fas fa-plus-circle text-5xl mb-3 opacity-90"></i>
                        <p class="text-lg font-bold mb-1">첫 기록 추가하기</p>
                        <p class="text-sm opacity-75">클릭해서 저장 테스트를 시작하세요</p>
                    </div>
                \`;
                renderPagination(pagination);
                updateBulkSelection();
            }

            async function loadMemories() {
                try {
                    renderCategoryChips();
                    const category = document.getElementById('category-filter').value;
                    const search = document.getElementById('search-input').value;
                    
                    const params = {
                        page: currentPage,
                        limit: 12,
                        ...(category && { category }),
                        ...(search && { search })
                    };
                    
                    const { data, pagination } = localMode ? getLocalPage() : (await axios.get(\`\${API_BASE}/memories\`, { params })).data;
                    renderMemoryCards(data, pagination);
                    /*
                        <div class="memory-card bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer" onclick="showMemoryDetail(\${memory.id})">
                            \${memory.file_url ? 
                                (memory.file_type?.startsWith('image') ? 
                                    \`<img src="\${memory.file_url}" alt="\${memory.title}" onerror="this.src='https://via.placeholder.com/400x200?text=이미지+로드+실패'">\` :
                                    \`<div class="w-full h-48 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                                        <i class="fas fa-video text-white text-4xl"></i>
                                    </div>\`
                                ) :
                                \`<div class="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                    <span class="text-6xl">\${memory.category_icon || '📦'}</span>
                                </div>\`
                            }
                            <div class="p-4">
                                <div class="flex items-start justify-between mb-2">
                                    <h3 class="text-lg font-bold text-gray-900 flex-1">\${memory.title}</h3>
                                    <div class="flex items-center space-x-1 ml-2">
                                        \${Array(Math.min(memory.importance_score || 5, 5)).fill('<i class="fas fa-star text-yellow-400 text-xs"></i>').join('')}
                                    </div>
                                </div>
                                <p class="text-sm text-gray-600 mb-3 line-clamp-2">\${memory.description || memory.ai_summary || ''}</p>
                                <div class="flex items-center justify-between text-xs">
                                    <span class="text-gray-500">\${new Date(memory.created_at).toLocaleDateString('ko-KR')}</span>
                                    <div class="flex items-center space-x-2">
                                        \${memory.ai_sentiment ? \`
                                            <span class="px-2 py-1 rounded-full \${
                                                memory.ai_sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                                                memory.ai_sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }">
                                                \${memory.ai_sentiment === 'positive' ? '😊' : memory.ai_sentiment === 'negative' ? '😢' : '😐'}
                                            </span>
                                        \` : ''}
                                        <span class="category-badge px-2 py-1 rounded-full text-xs" style="background-color: \${memory.category_color}20; color: \${memory.category_color}">
                                            \${memory.category_name || '미분류'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`).join('');
                    */
                } catch (error) {
                    console.error('Error loading memories:', error);
                    localMode = true;
                    const { data, pagination } = getLocalPage();
                    renderMemoryCards(data, pagination);
                }
            }

            async function loadTimeline() {
                try {
                    const memories = localMode
                        ? getLocalMemories().map(enrichMemory)
                        : (await axios.get(\`\${API_BASE}/memories?limit=100\`)).data.data;
                    
                    const grouped = memories.reduce((acc, memory) => {
                        const date = new Date(memory.original_date || memory.created_at);
                        const year = date.getFullYear();
                        const month = date.getMonth();
                        const key = \`\${year}-\${month}\`;
                        
                        if (!acc[key]) {
                            acc[key] = {
                                year,
                                month,
                                monthName: date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }),
                                memories: []
                            };
                        }
                        acc[key].memories.push(memory);
                        return acc;
                    }, {});
                    
                    const timeline = document.getElementById('timeline-content');
                    timeline.innerHTML = Object.values(grouped)
                        .sort((a, b) => b.year - a.year || b.month - a.month)
                        .map(group => \`
                            <div class="timeline-item">
                                <div class="timeline-dot"></div>
                                <h3 class="text-xl font-bold text-purple-600 mb-4">\${group.monthName}</h3>
                                <div class="space-y-3">
                                    \${group.memories.map(memory => \`
                                        <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer" onclick="showMemoryDetail(\${memory.id})">
                                            <div class="flex items-start space-x-3">
                                                \${memory.file_url && memory.file_type?.startsWith('image') ? 
                                                    \`<img src="\${memory.file_url}" class="w-16 h-16 rounded-lg object-cover">\` :
                                                    \`<span class="text-2xl">\${memory.category_icon || '📦'}</span>\`
                                                }
                                                <div class="flex-1">
                                                    <h4 class="font-semibold text-gray-900">\${memory.title}</h4>
                                                    <p class="text-sm text-gray-600 mt-1">\${memory.description || memory.ai_summary || ''}</p>
                                                    <p class="text-xs text-gray-400 mt-2">\${new Date(memory.created_at).toLocaleString('ko-KR')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    \`).join('')}
                                </div>
                            </div>
                        \`).join('');
                } catch (error) {
                    console.error('Error loading timeline:', error);
                    localMode = true;
                    const memories = getLocalMemories().map(enrichMemory);
                    document.getElementById('timeline-content').innerHTML = memories.length
                        ? memories.map(memory => \`
                            <div class="timeline-item">
                                <div class="timeline-dot"></div>
                                <div class="bg-white p-4 rounded-lg shadow-sm cursor-pointer" onclick="showMemoryDetail(\${memory.id})">
                                    <h4 class="font-semibold text-gray-900">\${memory.title}</h4>
                                    <p class="text-sm text-gray-600 mt-1">\${memory.description || memory.content || ''}</p>
                                    <p class="text-xs text-gray-400 mt-2">\${new Date(memory.created_at).toLocaleString('ko-KR')}</p>
                                </div>
                            </div>
                        \`).join('')
                        : '<div class="bg-white p-6 rounded-lg text-gray-500">아직 추가된 기록이 없습니다.</div>';
                }
            }

            function renderPagination(pagination) {
                const paginationEl = document.getElementById('pagination');
                const pages = [];
                
                const maxPages = Math.min(pagination.totalPages, 10);
                for (let i = 1; i <= maxPages; i++) {
                    pages.push(\`
                        <button onclick="goToPage(\${i})" class="px-4 py-2 \${i === pagination.page ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-purple-50'} rounded-lg border transition">
                            \${i}
                        </button>
                    \`);
                }
                
                paginationEl.innerHTML = pages.join('');
            }

            function goToPage(page) {
                currentPage = page;
                loadMemories();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            async function showMemoryDetail(id) {
                try {
                    const memory = localMode
                        ? enrichMemory(getLocalMemories().find(item => String(item.id) === String(id)))
                        : (await axios.get(\`\${API_BASE}/memories/\${id}\`)).data;
                    if (!memory) {
                        throw new Error('Memory not found');
                    }
                    
                    const content = document.getElementById('detail-content');
                    content.innerHTML = \`
                        <div class="flex justify-between items-start mb-6">
                            <div class="flex items-center space-x-3">
                                <span class="text-3xl">\${memory.category_icon || '📦'}</span>
                                <div>
                                    <h3 class="text-2xl font-bold text-gray-900">\${memory.title}</h3>
                                    <p class="text-sm text-gray-500">\${new Date(memory.created_at).toLocaleDateString('ko-KR')}</p>
                                </div>
                            </div>
                            <div class="flex">
                                <button onclick="closeDetailModal()" class="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>

                        \${renderEmotionSpotlight(memory)}
                        
                        \${memory.file_url ? \`
                            <div class="mb-6">
                                \${memory.file_type?.startsWith('image') ? 
                                    \`<img src="\${memory.file_url}" alt="\${memory.title}" class="w-full rounded-lg shadow-lg">\` :
                                    \`<video src="\${memory.file_url}" controls class="w-full rounded-lg shadow-lg"></video>\`
                                }
                            </div>
                        \` : ''}
                        
                        <div class="space-y-4">
                            <div>
                                <h4 class="text-sm font-semibold text-gray-700 mb-2">설명</h4>
                                <p class="text-gray-600">\${memory.description || '없음'}</p>
                            </div>
                            
                            <div>
                                <h4 class="text-sm font-semibold text-gray-700 mb-2">내용</h4>
                                <p class="text-gray-600 whitespace-pre-wrap">\${memory.content || '없음'}</p>
                            </div>
                            
                            <div class="flex flex-wrap gap-4 text-sm">
                                <div>
                                    <span class="text-gray-700 font-medium">중요도:</span>
                                    <span class="ml-2">\${Array(memory.importance_score || 5).fill('⭐').join('')}</span>
                                </div>
                            </div>
                            
                            \${memory.ai_summary ? \`
                                <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h4 class="text-sm font-semibold text-blue-900 mb-2">
                                        <i class="fas fa-robot mr-2"></i>AI 요약
                                    </h4>
                                    <p class="text-blue-800">\${memory.ai_summary}</p>
                                </div>
                            \` : ''}
                            
                            \${renderAIInsightBlocks(memory)}\n                            \${memory.ai_keywords ? \`
                                <div>
                                    <h4 class="text-sm font-semibold text-gray-700 mb-2">
                                        <i class="fas fa-tags mr-2"></i>AI 키워드
                                    </h4>
                                    <div class="flex flex-wrap gap-2">
                                        \${safeJsonList(memory.ai_keywords).map(kw => \`
                                            <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">\${kw}</span>
                                        \`).join('')}
                                    </div>
                                </div>
                            \` : ''}
                            
                            \${memory.connections && memory.connections.length > 0 ? \`
                                <div>
                                    <h4 class="text-sm font-semibold text-gray-700 mb-2">
                                        <i class="fas fa-link mr-2"></i>연결된 추억
                                    </h4>
                                    <div class="space-y-2">
                                        \${memory.connections.map(conn => \`
                                            <div class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition" onclick="showMemoryDetail(\${conn.id})">
                                                <p class="font-medium text-gray-900">\${conn.title}</p>
                                                <p class="text-xs text-gray-500">\${conn.connection_type} (강도: \${conn.strength}/10)</p>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>
                            \` : ''}
                        </div>
                    \`;
                    
                    document.getElementById('detail-modal').classList.remove('hidden');
                    document.getElementById('detail-modal').classList.add('flex');
                } catch (error) {
                    console.error('Error loading memory detail:', error);
                    const memory = enrichMemory(getLocalMemories().find(item => String(item.id) === String(id)));
                    if (memory) {
                        localMode = true;
                        const content = document.getElementById('detail-content');
                        content.innerHTML = \`
                            <div class="flex justify-between items-start mb-6">
                                <div class="flex items-center space-x-3">
                                    <span class="text-3xl">\${memory.category_icon || '📦'}</span>
                                    <div>
                                        <h3 class="text-2xl font-bold text-gray-900">\${memory.title}</h3>
                                        <p class="text-sm text-gray-500">\${new Date(memory.created_at).toLocaleDateString('ko-KR')}</p>
                                    </div>
                                </div>
                                <div class="flex space-x-2">
                                    <button onclick="editMemory(\${memory.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><i class="fas fa-edit"></i></button>
                                    <button onclick="deleteMemory(\${memory.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><i class="fas fa-trash"></i></button>
                                    <button onclick="closeDetailModal()" class="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition"><i class="fas fa-times"></i></button>
                                </div>
                            </div>

                            \${safeJsonList(memory.tags).length ? \`
                                <div>
                                    <h4 class="text-sm font-semibold text-gray-700 mb-2">태그</h4>
                                    <div class="flex flex-wrap gap-2">\${safeJsonList(memory.tags).map(tag => \`<span class="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">#\${escapeHtml(tag)}</span>\`).join('')}</div>
                                </div>
                            \` : ''}
                            \${memory.file_url ? \`<div class="mb-6">\${memory.file_type?.startsWith('image') ? \`<img src="\${memory.file_url}" alt="\${memory.title}" class="w-full rounded-lg shadow-lg">\` : \`<video src="\${memory.file_url}" controls class="w-full rounded-lg shadow-lg"></video>\`}</div>\` : ''}
                            <div class="space-y-4">
                                <div><h4 class="text-sm font-semibold text-gray-700 mb-2">설명</h4><p class="text-gray-600">\${memory.description || '없음'}</p></div>
                                <div><h4 class="text-sm font-semibold text-gray-700 mb-2">내용</h4><p class="text-gray-600 whitespace-pre-wrap">\${memory.content || '없음'}</p></div>
                            </div>
                        \`;
                        document.getElementById('detail-modal').classList.remove('hidden');
                        document.getElementById('detail-modal').classList.add('flex');
                    } else {
                        alert('추억을 불러오는데 실패했습니다.');
                    }
                }
            }

            function closeDetailModal() {
                document.getElementById('detail-modal').classList.add('hidden');
                document.getElementById('detail-modal').classList.remove('flex');
            }

            function normalizeImportanceStats(items) {
                const counts = Array(10).fill(0);
                (items || []).forEach(item => {
                    const score = Math.min(10, Math.max(1, Math.round(Number(item.score) || 5)));
                    counts[score - 1] += Number(item.count) || 0;
                });
                return counts.map((count, index) => ({ score: index + 1, count }));
            }

            async function showImportanceChart() {
                try {
                    const stats = localMode ? getLocalStats() : (await axios.get(API_BASE + '/statistics')).data;
                    const importance = normalizeImportanceStats(stats.importance);
                    const total = importance.reduce((sum, item) => sum + item.count, 0);
                    const weighted = importance.reduce((sum, item) => sum + item.score * item.count, 0);
                    const average = total ? weighted / total : 0;
                    const peak = importance.reduce((best, item) => item.count > best.count ? item : best, importance[0]);
                    const maxCount = Math.max(1, ...importance.map(item => item.count));
                    const chart = document.getElementById('importance-chart-content');

                    chart.innerHTML = \`
                        <div class="importance-summary">
                            <div><span>평균 중요도</span><strong>\${average.toFixed(1)}<small>/ 10</small></strong></div>
                            <div><span>분석한 추억</span><strong>\${total}<small>개</small></strong></div>
                            <div><span>가장 많은 점수</span><strong>\${total ? peak.score : '-'}<small>\${total ? '점' : ''}</small></strong></div>
                        </div>
                        \${total ? \`
                            <div class="importance-chart-bars" role="img" aria-label="중요도 1점부터 10점까지의 추억 개수 막대 그래프">
                                \${importance.map(item => \`
                                    <div class="importance-bar-item" title="\${item.score}점: \${item.count}개">
                                        <span class="importance-bar-count">\${item.count || ''}</span>
                                        <div class="importance-bar-track"><span style="height:\${item.count ? Math.max(8, Math.round(item.count / maxCount * 100)) : 0}%"></span></div>
                                        <b>\${item.score}</b>
                                    </div>
                                \`).join('')}
                            </div>
                            <p class="importance-axis-label">중요도 점수</p>
                        \` : \`<div class="importance-empty"><i class="fas fa-chart-bar"></i><p>아직 분석할 추억이 없습니다.</p><span>추억을 추가하고 중요도를 설정해 보세요.</span></div>\`}
                    \`;
                    document.getElementById('importance-modal').classList.remove('hidden');
                    document.getElementById('importance-modal').classList.add('flex');
                } catch (error) {
                    console.error('Error loading importance chart:', error);
                    alert('중요도 그래프를 불러오지 못했습니다.');
                }
            }

            function closeImportanceChart() {
                document.getElementById('importance-modal').classList.add('hidden');
                document.getElementById('importance-modal').classList.remove('flex');
            }

            function showRandomMemory() {
                const memories = getLocalMemories();
                if (!memories.length) {
                    alert('다시 볼 추억이 없습니다. 먼저 추억을 추가해 주세요.');
                    return;
                }
                const memory = memories[Math.floor(Math.random() * memories.length)];
                showMemoryDetail(memory.id);
            }

            function duplicateMemory(id) {
                const memories = getLocalMemories();
                const original = memories.find(memory => String(memory.id) === String(id));
                if (!original) {
                    alert('복제할 추억을 찾지 못했습니다.');
                    return;
                }
                const now = new Date().toISOString();
                const copy = {
                    ...original,
                    id: Date.now(),
                    title: \`\${original.title} (복사본)\`,
                    created_at: now,
                    updated_at: now
                };
                saveLocalMemories([copy, ...memories]);
                closeDetailModal();
                showView('memories');
                alert('추억을 복제했습니다.');
            }

            let fabMenuOpen = false;
            
            function toggleFabMenu() {
                fabMenuOpen = !fabMenuOpen;
                const mainFab = document.querySelector('.fab-button i');
                const photoItem = document.getElementById('fab-photo');
                const videoItem = document.getElementById('fab-video');
                const docItem = document.getElementById('fab-document');
                const snsItem = document.getElementById('fab-sns');
                
                if (fabMenuOpen) {
                    mainFab.style.transform = 'rotate(45deg)';
                    setTimeout(() => photoItem.classList.add('show'), 50);
                    setTimeout(() => videoItem.classList.add('show'), 100);
                    setTimeout(() => docItem.classList.add('show'), 150);
                    setTimeout(() => snsItem.classList.add('show'), 200);
                } else {
                    mainFab.style.transform = 'rotate(0deg)';
                    photoItem.classList.remove('show');
                    videoItem.classList.remove('show');
                    docItem.classList.remove('show');
                    snsItem.classList.remove('show');
                }
            }
            
            function showAddMemory(type = null) {
                // Close FAB menu if open
                if (fabMenuOpen) {
                    toggleFabMenu();
                }
                
                document.getElementById('modal-title').textContent = '추억 추가';
                document.getElementById('memory-form').reset();
                document.getElementById('memory-id').value = '';
                document.getElementById('file-preview').innerHTML = '';
                uploadedFileUrl = null;
                
                // Pre-select category based on type
                const categorySelect = document.getElementById('category');
                const selectedFilter = document.getElementById('category-filter')?.value;
                if (selectedFilter) {
                    categorySelect.value = selectedFilter;
                }
                if (type === 'photo') {
                    categorySelect.value = '1'; // 사진
                    document.getElementById('modal-title').textContent = '📷 사진 추가';
                } else if (type === 'video') {
                    categorySelect.value = '2'; // 동영상
                    document.getElementById('modal-title').textContent = '🎥 동영상 추가';
                } else if (type === 'document') {
                    categorySelect.value = '3'; // 문서
                    document.getElementById('modal-title').textContent = '📄 문서 추가';
                } else if (type === 'sns') {
                    categorySelect.value = '4'; // SNS 게시물
                    document.getElementById('modal-title').textContent = '💬 SNS 게시물 추가';
                }
                
                document.getElementById('memory-modal').classList.remove('hidden');
                document.getElementById('memory-modal').classList.add('flex');
            }

            async function editMemory(id) {
                try {
                    const memory = localMode
                        ? enrichMemory(getLocalMemories().find(item => String(item.id) === String(id)))
                        : (await axios.get(\`\${API_BASE}/memories/\${id}\`)).data;
                    if (!memory) {
                        throw new Error('Memory not found');
                    }
                    
                    document.getElementById('modal-title').textContent = '추억 수정';
                    document.getElementById('memory-id').value = memory.id;
                    document.getElementById('title').value = memory.title;
                    document.getElementById('category').value = memory.category_id || '';
                    document.getElementById('description').value = memory.description || '';
                    document.getElementById('content').value = memory.content || '';
                    document.getElementById('tags').value = safeJsonList(memory.tags).join(', ');
                    document.getElementById('file-url').value = memory.file_url || '';
                    document.getElementById('importance-score').value = memory.importance_score || 5;
                    document.getElementById('importance-value').textContent = memory.importance_score || 5;
                    
                    if (memory.original_date) {
                        const date = new Date(memory.original_date);
                        document.getElementById('original-date').value = date.toISOString().slice(0, 16);
                    }
                    
                    if (memory.file_url) {
                        const preview = document.getElementById('file-preview');
                        if (memory.file_type?.startsWith('image')) {
                            preview.innerHTML = \`<img src="\${memory.file_url}" class="mt-2 rounded-lg max-h-48 object-cover">\`;
                        }
                    }
                    
                    closeDetailModal();
                    document.getElementById('memory-modal').classList.remove('hidden');
                    document.getElementById('memory-modal').classList.add('flex');
                } catch (error) {
                    console.error('Error loading memory:', error);
                    const memory = enrichMemory(getLocalMemories().find(item => String(item.id) === String(id)));
                    if (memory) {
                        localMode = true;
                        document.getElementById('modal-title').textContent = '추억 수정';
                        document.getElementById('memory-id').value = memory.id;
                        document.getElementById('title').value = memory.title;
                        document.getElementById('category').value = memory.category_id || '';
                        document.getElementById('description').value = memory.description || '';
                        document.getElementById('content').value = memory.content || '';
                        document.getElementById('tags').value = safeJsonList(memory.tags).join(', ');
                        document.getElementById('file-url').value = memory.file_url || '';
                        document.getElementById('importance-score').value = memory.importance_score || 5;
                        document.getElementById('importance-value').textContent = memory.importance_score || 5;
                        closeDetailModal();
                        document.getElementById('memory-modal').classList.remove('hidden');
                        document.getElementById('memory-modal').classList.add('flex');
                    } else {
                        alert('추억을 불러오는데 실패했습니다.');
                    }
                }
            }

            async function handleMemorySubmit(e) {
                e.preventDefault();
                
                const id = document.getElementById('memory-id').value;
                const fileUrl = uploadedFileUrl || document.getElementById('file-url').value;
                
                const data = {
                    title: document.getElementById('title').value,
                    category_id: document.getElementById('category').value ? parseInt(document.getElementById('category').value) : null,
                    description: document.getElementById('description').value,
                    content: document.getElementById('content').value,
                    tags: [...new Set(document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(Boolean))].slice(0, 10),
                    file_url: fileUrl || null,
                    file_type: fileUrl ? ((fileUrl.match(/\\.(jpg|jpeg|png|gif|webp)(\\?|$)/i) || fileUrl.includes('images.unsplash.com') || document.getElementById('category').value === '1') ? 'image' : 'video') : null,
                    importance_score: parseInt(document.getElementById('importance-score').value),
                    original_date: document.getElementById('original-date').value || null,
                    auto_analyze: document.getElementById('auto-analyze').checked
                };
                
                try {
                    if (localMode) {
                        saveLocalMemory(data, id || null);
                    } else if (id) {
                        await axios.put(\`\${API_BASE}/memories/\${id}\`, data);
                    } else {
                        await axios.post(\`\${API_BASE}/memories\`, data);
                    }
                    
                    closeModal();
                    if (currentView === 'memories') {
                        loadMemories();
                    } else if (currentView === 'timeline') {
                        loadTimeline();
                    } else {
                        loadStatistics();
                    }
                    alert('저장되었습니다!');
                } catch (error) {
                    console.error('Error saving memory:', error);
                    localMode = true;
                    saveLocalMemory(data, id || null);
                    closeModal();
                    renderCategoryChips();
                    if (currentView === 'memories') {
                        loadMemories();
                    } else if (currentView === 'timeline') {
                        loadTimeline();
                    } else {
                        loadStatistics();
                    }
                    alert('저장되었습니다!');
                }
            }

            async function deleteMemory(id) {
                if (!confirm('정말 삭제하시겠습니까?')) return;
                
                try {
                    if (localMode) {
                        deleteLocalMemory(id);
                    } else {
                        await axios.delete(\`\${API_BASE}/memories/\${id}\`);
                    }
                    closeDetailModal();
                    if (currentView === 'memories') {
                        loadMemories();
                    } else if (currentView === 'timeline') {
                        loadTimeline();
                    } else {
                        loadStatistics();
                    }
                    alert('삭제되었습니다.');
                } catch (error) {
                    console.error('Error deleting memory:', error);
                    localMode = true;
                    deleteLocalMemory(id);
                    closeDetailModal();
                    if (currentView === 'memories') {
                        loadMemories();
                    } else if (currentView === 'timeline') {
                        loadTimeline();
                    } else {
                        loadStatistics();
                    }
                    alert('삭제되었습니다.');
                }
            }

            async function bulkDeleteSelected() {
                if (!selectedMemoryIds.size) return;
                if (!confirm(\`선택한 \${selectedMemoryIds.size}개의 추억을 삭제하시겠습니까?\`)) return;

                const selected = new Set(selectedMemoryIds);
                saveLocalMemories(getLocalMemories().filter(memory => !selected.has(String(memory.id))));
                localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify([...getFavoriteIds()].filter(id => !selected.has(String(id)))));
                selectedMemoryIds.clear();
                currentPage = 1;
                updateBulkSelection();
                await loadMemories();
                await loadStatistics();
                alert('선택한 추억을 삭제했습니다.');
            }

            async function importData(event) {
                const input = event.target;
                const file = input.files?.[0];
                if (!file) return;
                try {
                    if (file.size > 25 * 1024 * 1024) throw new Error('백업 파일은 25MB 이하여야 합니다.');
                    const parsed = JSON.parse(await file.text());
                    const imported = Array.isArray(parsed) ? parsed : parsed.memories;
                    if (!Array.isArray(imported)) throw new Error('memories 배열이 없는 백업 파일입니다.');
                    const valid = imported.filter(memory => memory && typeof memory.title === 'string' && memory.title.trim());
                    if (!valid.length) throw new Error('복원할 수 있는 추억이 없습니다.');
                    if (!confirm(\`백업에서 \${valid.length}개의 추억을 가져옵니다. 기존 자료와 합칠까요?\`)) return;

                    const existing = getLocalMemories();
                    const known = new Set(existing.map(memory => String(memory.id)));
                    const now = Date.now();
                    const normalized = valid.map((memory, index) => {
                        const candidateId = String(memory.id || '');
                        const id = candidateId && !known.has(candidateId) ? memory.id : now + index;
                        known.add(String(id));
                        return {
                            ...memory,
                            id,
                            title: memory.title.trim(),
                            importance_score: Math.min(10, Math.max(1, Number(memory.importance_score) || 5)),
                            created_at: memory.created_at || new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };
                    });
                    saveLocalMemories([...normalized, ...existing]);
                    currentPage = 1;
                    await loadMemories();
                    await loadStatistics();
                    alert(\`\${normalized.length}개의 추억을 복원했습니다.\`);
                } catch (error) {
                    console.error('Error importing data:', error);
                    alert(error.message || '백업 파일을 복원하지 못했습니다.');
                } finally {
                    input.value = '';
                }
            }

            async function exportData() {
                try {
                    const data = localMode
                        ? { version: '3.6.0', exported_at: new Date().toISOString(), memories: getLocalMemories(), favorite_ids: [...getFavoriteIds()] }
                        : (await axios.get(\`\${API_BASE}/export\`)).data;
                    
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`memorylink-export-\${new Date().toISOString().split('T')[0]}.json\`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    alert('데이터를 내보냈습니다!');
                } catch (error) {
                    console.error('Error exporting data:', error);
                    alert('내보내기에 실패했습니다.');
                }
            }

            function closeModal() {
                document.getElementById('memory-modal').classList.add('hidden');
                document.getElementById('memory-modal').classList.remove('flex');
            }

            function showView(view) {
                currentView = view;
                document.getElementById('dashboard-view').classList.toggle('hidden', view !== 'dashboard');
                document.getElementById('memories-view').classList.toggle('hidden', view !== 'memories');
                document.getElementById('timeline-view').classList.toggle('hidden', view !== 'timeline');
                document.querySelectorAll('[data-mobile-view]').forEach(function(button) {
                    const selected = button.dataset.mobileView === view;
                    button.classList.toggle('active', selected);
                    button.setAttribute('aria-current', selected ? 'page' : 'false');
                });
                
                if (view === 'memories') {
                    loadMemories();
                } else if (view === 'dashboard') {
                    loadStatistics();
                } else if (view === 'timeline') {
                    loadTimeline();
                }
            }

            function debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            }

            // Initialize on page load
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function(error) {
                        console.warn('Service worker registration skipped:', error);
                    });
                });
            }
            showAuthContainer();
            showRegister();
        </script>
    </body>
    </html>
  `)
})

export default app






