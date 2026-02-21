# AI 릴레이 만화 — 개발 규칙

본 문서는 AI Agent가 `ai_webtoon` 프로젝트에서 개발 작업을 수행할 때 따라야 하는 규범입니다.

---

## 1. 프로젝트 개요

- **프로젝트명**: AI 릴레이 만화
- **슬로건**: 그림 실력 없어도 만화 작가가 되는 서비스
- **행사**: 제 1회 OKKY 바이브코딩 해커톤
- **목적**: AI 이미지 생성과 멀티유저 릴레이 방식으로 누구나 만화를 만들고 공유할 수 있는 웹 서비스
- **기술 스택**:
  | 영역 | 기술 |
  |------|------|
  | Frontend | Next.js (App Router) + React 18+ + Tailwind CSS |
  | Backend / DB | Supabase (PostgreSQL + Realtime + Storage) |
  | 이미지 생성 | Gemini 2.5 Flash Image (Google AI Studio) |
  | 스토리 AI | Gemini 2.5 Flash API |
  | 배포 | Vercel (Serverless / Edge Functions) |
  | 패키지 관리 | npm |

---

## 2. 프로젝트 구조

```
ai_webtoon/
├── app/                   # Next.js App Router 페이지·레이아웃
│   ├── page.tsx           # S1 메인(랜딩)
│   ├── create/            # S2 에피소드 생성
│   ├── c/[episodeId]/     # S6 닉네임 입력 (콜라보 링크 진입)
│   ├── e/[episodeId]/     # S9 감상(뷰어)
│   └── api/               # Next.js API Routes (Gemini 호출 등 서버 전용)
├── components/            # 공용 React 컴포넌트
│   ├── ui/                # 버튼, 토스트, 스켈레톤 등 원자 컴포넌트
│   └── features/          # 도메인별 복합 컴포넌트 (PanelCard, StripViewer 등)
├── lib/                   # 유틸리티 및 외부 클라이언트 초기화
│   ├── supabase/          # Supabase 클라이언트 (브라우저·서버 분리)
│   └── gemini/            # Gemini API 호출 헬퍼
├── types/                 # TypeScript 타입 정의
├── hooks/                 # 커스텀 React 훅
├── docs/                  # 기획·설계 문서
├── SPEC.md                # 기능 요구사항 명세 (작업마다 갱신)
├── ADR.md                 # 아키텍처 결정 기록 (작업마다 갱신)
├── AGENTS.md              # AI Agent 핵심 지침
└── shrimp-rules.md        # 본 문서
```

> **`dist/`, `.next/`** 디렉터리는 빌드 산출물입니다. **직접 수정 금지.**

---

## 3. 환경 변수

| 변수명 | 위치 | 설명 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 클라이언트 + 서버 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 + 서버 | Supabase 익명 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 | Supabase 서비스 롤 키 |
| `GEMINI_API_KEY` | 서버 전용 | Gemini 이미지·스토리 API 키 |

- **`GEMINI_API_KEY`는 절대로 클라이언트(브라우저)에 노출하지 않는다.**
  - `NEXT_PUBLIC_` 접두사를 붙이지 않으며, API Route 또는 Server Action을 통해서만 호출한다.
- 민감 정보는 `.env.local`에 두고 버전 관리(Git)에 커밋하지 않는다.
- `.env.example`을 변경하면 팀원에게 즉시 공유한다.

---

## 4. 데이터 모델 (MVP)

### 4.1 테이블 정의

```sql
-- 에피소드
episodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style           TEXT NOT NULL,            -- 스타일 키 (webtoon | four_cut | shoujo | ...)
  character_prompt TEXT NOT NULL,
  title           TEXT,
  summary         TEXT,
  status          TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | completed
  current_turn_index INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- 참여자
participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id      UUID REFERENCES episodes(id) ON DELETE CASCADE,
  nickname        TEXT NOT NULL,
  turn_order      INT NOT NULL,             -- 0 = 방장
  joined_at       TIMESTAMPTZ DEFAULT now()
)

-- 칸(패널)
panels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id      UUID REFERENCES episodes(id) ON DELETE CASCADE,
  order_index     INT NOT NULL,
  scene_description TEXT NOT NULL,
  dialogue        TEXT,
  sound_effect    TEXT,
  bubble_position TEXT DEFAULT 'center',   -- left | right | center
  image_url       TEXT,                    -- Supabase Storage URL
  created_by      UUID REFERENCES participants(id),
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- 좋아요
panel_likes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id        UUID REFERENCES panels(id) ON DELETE CASCADE,
  anonymous_id    TEXT NOT NULL,           -- 클라이언트 로컬 UUID
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(panel_id, anonymous_id)
)
```

### 4.2 Realtime 구독 대상

| 테이블 | 이벤트 | UI 갱신 |
|-------|--------|---------|
| `panels` | `INSERT` | 스트립에 새 칸 추가 |
| `episodes` | `UPDATE` (current_turn_index) | 턴 표시 전환, 입력창 활성/비활성 |
| `participants` | `INSERT` | 참여자 목록 즉시 추가 |

---

## 5. 핵심 기능·완료 기준

| 기능 | 완료 기준 |
|------|----------|
| 스타일 고정 | 에피소드 생성 시 6종 프리셋 선택 → DB 저장 → 이후 변경 불가 |
| 이미지 생성 | 장면·대사·표음·말풍선 위치 입력 → Gemini API 호출 → Storage 저장 → 칸 URL 연결 |
| 캐릭터 일관성 | 2칸부터 직전 칸 이미지를 reference image로 API에 전달 |
| 멀티유저 콜라보 | 링크 진입 → 닉네임 입력 → participants 등록 → Realtime 턴 반영 |
| AI 이어쓰기 | 3칸 이상 시 활성화 → Gemini Flash API 스토리 생성 → 칸별 이미지 순차 생성 |
| 좋아요 | 칸 단위 저장 → 에피소드 상단 합산 표시 |
| SNS 공유 | 스트립 PNG 다운로드 + `/e/{episodeId}` 링크 복사 |

---

## 6. 화면 목록 (MVP)

| ID | 화면 | 경로 |
|----|------|------|
| S1 | 메인(랜딩) | `/` |
| S2 | 에피소드 생성 | `/create` |
| S3 | 칸 입력 | (S5 내 모달 or `/create/panel`) |
| S4 | 생성 중 로딩 | (S3 오버레이) |
| S5 | 콜라보 대기실 | `/c/{episodeId}` (참여 후) |
| S6 | 닉네임 입력 | `/c/{episodeId}` (진입 시) |
| S7 | AI 이어쓰기 확인 | (S5 내 바텀시트) |
| S8 | 공유 | (S5 내 바텀시트) |
| S9 | 감상(뷰어) | `/e/{episodeId}` |

---

## 7. 코드 규칙

### 7.1 언어·포맷

- **TypeScript strict 모드** 사용. `tsconfig.json`의 `"strict": true` 수정 금지.
- **`any` 타입 금지.** 불가피한 경우 이유를 주석으로 명시.
- 들여쓰기: 스페이스 2칸. Tab 문자 금지.
- 문자열: 단일 따옴표(`'`) 우선.
- 세미콜론: 항상 붙임.
- 한 줄 최대 길이: 120자.

### 7.2 명명 규칙

| 대상 | 방식 | 예시 |
|------|------|------|
| 변수·함수 | camelCase | `episodeId`, `fetchPanel` |
| 컴포넌트·클래스·인터페이스 | PascalCase | `PanelCard`, `EpisodeService` |
| 파일명 | kebab-case 또는 PascalCase(컴포넌트) | `panel-card.tsx`, `PanelCard.tsx` |
| 상수 | UPPER_SNAKE_CASE | `MAX_PANELS`, `STYLE_PRESETS` |
| DB 컬럼·API 필드 | snake_case | `episode_id`, `image_url` |

### 7.3 컴포넌트 규칙

- 화면 단위 컴포넌트는 `app/` 경로의 `page.tsx`로 정의.
- 재사용 UI 원자 컴포넌트는 `components/ui/`에 위치.
- 도메인 복합 컴포넌트는 `components/features/`에 위치.
- `use client` / `use server` 지시문을 명확히 선언.
- props 타입은 인터페이스로 정의. `React.FC` 사용 금지.

### 7.4 API Route 규칙

- Gemini API 키를 사용하는 모든 호출은 `app/api/` 경로의 Route Handler에서만 수행.
- 클라이언트에서 Gemini를 직접 호출하는 코드 작성 금지.
- 요청 body는 Zod로 검증.

### 7.5 Supabase 클라이언트

- 브라우저 클라이언트: `lib/supabase/client.ts` (`createBrowserClient`)
- 서버 클라이언트: `lib/supabase/server.ts` (`createServerClient`)
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 클라이언트에서만 사용.

---

## 8. 에러·예외 처리

| 상황 | 처리 방식 |
|------|----------|
| Gemini 이미지 생성 30초 타임아웃 | 실패 오버레이 표시, 입력값 유지, "다시 생성" 버튼 노출 |
| Gemini API 오류 (5xx 등) | 토스트 "잠시 후 다시 시도해주세요" + 재시도 버튼 |
| 유해 콘텐츠 필터 | "내용을 조금 수정해 주세요" 안내 후 재시도 유도 |
| Realtime 연결 끊김 | 자동 재연결 시도, 실패 시 토스트 안내 |
| 동시 턴 충돌 | Supabase lock 기반 턴 소유자 단독 입력 보장 |
| 참여자 중도 이탈 | 방장이 "다음 차례로 넘기기" (MVP: 스킵만 가능) |

---

## 9. 마일스톤 목표

| 단계 | 목표 | 핵심 화면 |
|------|------|----------|
| M2 | 단일 유저 플로우 완성 | S1 → S2 → S3 → S4 → S5(스트립 뷰) |
| M3 | 콜라보 + Realtime | S6 추가, S5 Realtime 연결 |
| M4 | AI 이어쓰기 + 공유 | S7, S8 추가 |
| M5 | 데모 완성 | S9, 에러·토스트·좋아요 |

---

## 10. 해커톤 공정성 지침 (AGENTS.md 기준)

- **작업 변경마다 커밋**을 수행한다. 작은 단위로 자주 커밋.
- **기능 요구사항이 확정될 때마다 `SPEC.md`를 갱신**한다.
- **아키텍처·설계·인사이트가 결정될 때마다 `ADR.md`를 갱신**한다.
- 커밋 메시지는 Conventional Commits 형식을 따른다.
  - 예: `feat: 에피소드 생성 페이지 추가`, `fix: 턴 인덱스 업데이트 오류 수정`
- 민감 정보(API Key, 서비스 롤 키)는 절대 커밋하지 않는다.

---

## 11. 금지 사항

- **`GEMINI_API_KEY` 클라이언트 노출** — 서버 API Route 경유 필수.
- **`dist/`, `.next/` 직접 수정** — 빌드 산출물.
- **TypeScript strict 오류 무시** — 모든 타입 오류 해결 필수.
- **`any` 타입 무분별 사용** — 이유 없는 `any` 금지.
- **Realtime 없이 polling 구현** — Supabase Realtime 활용.
- **`SPEC.md` / `ADR.md` 갱신 없이 기능 추가** — 해커톤 공정성 위반.
- **테스트 없는 주요 분기 코드** — 핵심 유틸·API 헬퍼는 단위 테스트 작성.

---

## 12. AI Agent 의사결정 규칙

### 12.1 모호한 요청 처리

1. 관련 코드·문서(`docs/`, `SPEC.md`)를 먼저 분석한다.
2. 1~2가지 구체적 구현 방안을 제시하고 차이를 설명한다.
3. 대규모 구조 변경은 확인 후 진행한다.

### 12.2 새 의존성 추가

1. 현재 패키지(`package.json`)에 대안이 없는지 확인한다.
2. 활발히 유지되는 라이브러리인지 검토한다.
3. MIT/Apache 2.0 등 프로젝트와 호환되는 라이선스인지 확인한다.
4. 추가 후 반드시 `npm install` 실행 및 커밋.

### 12.3 Gemini API 프롬프트 작성

이미지 생성 프롬프트 구성 순서:
1. **스타일 prefix** (에피소드 스타일 고정 문구)
2. **캐릭터 고정값** (방장이 설정한 캐릭터 묘사)
3. **이전 칸 이미지** (reference image — 2칸 이상일 때)
4. **현재 칸 내용** (장면 설명 + 대사 + 표음 + 말풍선 위치)

---

## 13. 이 문서 갱신 규칙

- 기술 스택·아키텍처·핵심 워크플로우가 변경될 때 **반드시 동기화 갱신**한다.
- 갱신 시 변경된 섹션과 이유를 명시한다.
- 모호한 "규칙 업데이트" 지시가 오면 Agent는 코드베이스를 먼저 분석하고 구체적 수정안을 제시한다.

---

*이 규칙은 AI Agent가 ai_webtoon 프로젝트에서 일관되고 안전하게 개발 작업을 수행하도록 돕기 위해 작성되었습니다.*
