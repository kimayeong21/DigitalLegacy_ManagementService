import { serve } from '@hono/node-server'
import app from './.tmp/app-bundle.mjs'

const port = Number(process.env.PORT || 5173)

serve({
  fetch: app.fetch,
  port,
  hostname: '127.0.0.1'
}, (info) => {
  console.log(`AI 추억 관리 서비스 실행 중: http://127.0.0.1:${info.port}`)
})
