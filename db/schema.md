# MySQL Schema

## users

사용자 계정 정보를 저장합니다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | 사용자 ID |
| `email` | 로그인 이메일 |
| `password` | SHA-256 해시 비밀번호 |
| `name` | 사용자 이름 |
| `avatar_url` | 프로필 이미지 |
| `created_at` | 가입 일시 |
| `updated_at` | 수정 일시 |

## sessions

로그인 상태를 유지하기 위한 세션 테이블입니다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | 세션 ID |
| `user_id` | 사용자 ID |
| `expires_at` | 만료 일시 |
| `created_at` | 생성 일시 |

## categories

추억 분류 기준을 저장합니다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | 카테고리 ID |
| `name` | 카테고리 이름 |
| `icon` | 화면 표시 아이콘 |
| `color` | 화면 표시 색상 |
| `created_at` | 생성 일시 |

## memories

사용자의 추억과 AI 분석 결과를 저장하는 핵심 테이블입니다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | 추억 ID |
| `user_id` | 작성 사용자 |
| `category_id` | 카테고리 |
| `title` | 제목 |
| `description` | 짧은 설명 |
| `content` | 상세 내용 |
| `file_url` | 이미지/파일 URL |
| `file_type` | 파일 유형 |
| `tags` | 태그 JSON |
| `importance_score` | 중요도 |
| `original_date` | 실제 추억 날짜 |
| `ai_summary` | AI 요약 |
| `ai_sentiment` | AI 감정 분석 |
| `ai_keywords` | AI 키워드 JSON |
| `ai_scene_type` | AI 장면 판별 |
| `ai_atmosphere` | AI 분위기 분석 |
| `ai_felt_emotion` | AI가 판단한 기분 |
| `ai_image_observations` | 이미지/설명 관찰 |
| `ai_memory_meaning` | 추억 의미 |
| `ai_confidence` | 분석 신뢰도 |

## connections

서로 연관된 추억을 연결합니다.

| 컬럼 | 설명 |
| --- | --- |
| `id` | 연결 ID |
| `memory_id_1` | 첫 번째 추억 |
| `memory_id_2` | 두 번째 추억 |
| `connection_type` | 연결 유형 |
| `strength` | 연결 강도 |
| `created_at` | 생성 일시 |
