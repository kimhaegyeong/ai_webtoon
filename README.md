# AI 릴레이 만화 (ai_webtoon)

OKKY 바이브코딩 해커톤 MVP 프로젝트.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js (App Router) + React 18+ + Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL + Realtime + Storage) |
| 이미지 생성 | Gemini 2.5 Flash Image (Google AI Studio) |
| 스토리 AI | Gemini 2.5 Flash API |
| 배포 | Vercel |
| 패키지 관리 | npm |

## 로컬 개발 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local`에 아래 값을 채웁니다:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase 익명 키
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase 서비스 롤 키 (서버 전용)
- `GEMINI_API_KEY` — Gemini API 키 (서버 전용, 클라이언트 노출 금지)

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 타입 검사 / 린트

```bash
npm run typecheck
npm run lint
```

## 프로젝트 구조

```
app/                   # Next.js App Router
  page.tsx             # S1 메인(랜딩)
  create/page.tsx      # S2 에피소드 생성
  c/[episodeId]/       # S5/S6 콜라보 대기실 / 닉네임 입력
  e/[episodeId]/       # S9 감상(뷰어)
  api/                 # Route Handler (Gemini 호출 등 서버 전용)
components/
  ui/                  # 버튼, 토스트 등 원자 컴포넌트
  features/            # 도메인 복합 컴포넌트
lib/
  supabase/            # Supabase 클라이언트 (브라우저·서버 분리)
  gemini/              # Gemini API 헬퍼
types/                 # TypeScript 타입 정의
hooks/                 # 커스텀 React 훅
```

## 문서

- 기능 요구사항: `SPEC.md`
- 아키텍처/설계 결정: `ADR.md`
- 개발 규칙: `shrimp-rules.md`
- 사전 기획안: `docs/사전 개발 기획안.md`
