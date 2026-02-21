# ADR — 아키텍처/설계 결정

> AI 릴레이 만화 | `docs/사전 개발 기획안.md` 기반 산출
>

## ADR-1: 프론트엔드 — Next.js (App Router) + Tailwind CSS

- **결정**: React 18+ 기반 Next.js App Router, 스타일링 Tailwind CSS v4.
- **이유**: 서버 컴포넌트·API Route·Vercel 배포를 단일 프레임워크로 통합. Gemini API 키를 Route Handler로 격리하는 데 최적. (초기 Vite SPA 계획에서 변경 — ADR-8 참고)

## ADR-2: 백엔드·DB·Realtime — Supabase

- **결정**: PostgreSQL + Realtime + Storage를 Supabase 한 플랫폼으로 사용.
- **이유**: 인증 없이 익명 참여를 전제로 하며, 링크+닉네임만으로 참여. Realtime으로 턴/칸 반영을 즉시 구독 가능. RLS 또는 공개 읽기/쓰기 정책은 보안 요구에 따라 선택.

## ADR-3: 이미지 생성 — Gemini 2.5 Flash Image

- **결정**: 만화 칸 1장당 Gemini 2.5 Flash Image API 1회 호출. 스타일 prefix + 캐릭터 + 이전 칸 레퍼런스 + 현재 칸 내용.
- **이유**: 말풍선·대사·표음을 포함한 한 컷 생성에 적합. 레퍼런스 이미지로 캐릭터 일관성 유지.

## ADR-4: 스토리 자동완성 — Gemini 2.0 Flash (텍스트)

- **결정**: "AI에게 맡기기" 시 Gemini 2.0 Flash(텍스트)로 장면·대사·표음·말풍선 위치를 JSON으로 생성하고, 칸별로 Gemini Image API 호출.
- **이유**: 초기 계획은 Claude API였으나, 해커톤 환경에서 단일 API 키(`GEMINI_API_KEY`)로 텍스트·이미지 생성을 통합 처리. `@google/generative-ai` 패키지만으로 전체 파이프라인 구성 가능.
- **변경**: 기존 ADR에 Claude API로 기재되었으나 Gemini Flash 텍스트 모델(`gemini-2.0-flash`)로 구현.

## ADR-5: API 키·호출 위치

- **결정**: Gemini API 키는 클라이언트에 노출하지 않고, Next.js API Route Handler(`app/api/`)에서만 호출.
- **이유**: API 키 유출 방지. `NEXT_PUBLIC_` 접두사 없는 환경변수는 서버에만 노출되므로 안전.

## ADR-6: 배포 — Vercel

- **결정**: 프론트 + Serverless/Edge API는 Vercel 무료 티어로 배포.
- **이유**: Git 연동·프리뷰·환경 변수 관리 용이. 해커톤 데모 안정성.

## ADR-7: 데이터 모델 요약

- **episodes**: 스타일, 캐릭터 프롬프트, 제목/요약, 현재 턴 인덱스, 상태(draft | in_progress | completed).
- **participants**: 에피소드별 닉네임, 턴 순서(turn_order). 0 = 방장.
- **panels**: order_index, 장면/대사/표음/말풍선 위치, image_url(Storage), created_by. 좋아요는 panel_likes 등 별도 구조로 칸별 집계.

## ADR-8: Vite → Next.js 마이그레이션

- **결정**: 초기 기획의 Vite SPA 대신 Next.js App Router를 채택.
- **이유**: `app/api/` Route Handler가 Gemini API 키 서버 격리를 자연스럽게 지원. Vercel 배포 시 별도 백엔드 서버 불필요. SSR/SSG 선택적 적용으로 SEO(공유 뷰어 페이지) 대응 가능.
- **영향**: 환경변수 접두사 `VITE_` → `NEXT_PUBLIC_`, Tailwind v4 + `@tailwindcss/postcss` 플러그인 사용.

## ADR-9: Realtime 구독 전략 — Supabase Postgres Changes

- **결정**: `panels INSERT`, `episodes UPDATE`, `participants INSERT` 이벤트를 단일 채널(`episode-{id}`)로 구독. 자기 패널 중복 방지는 `useRef`로 참여자 ID를 클로저-안전하게 유지.
- **이유**: Supabase Realtime의 Postgres Changes는 행 필터(`episode_id=eq.{id}`)를 서버 사이드에서 처리하므로 클라이언트로 불필요한 이벤트가 전달되지 않음.
- **주의**: Supabase 대시보드에서 해당 테이블의 Realtime을 활성화해야 구독이 동작함.

## ADR-10: 익명 참여 식별 — localStorage UUID

- **결정**: 인증 없이 두 가지 UUID를 localStorage에 저장.
  - `participant_{episodeId}`: 에피소드별 참여자 ID (participants 테이블 PK)
  - `anon_id`: 좋아요용 기기 고유 식별자 (panel_likes.anonymous_id)
- **이유**: 회원가입 없는 즉시 참여가 해커톤 MVP의 핵심 UX. 보안보다 접근성 우선.
- **보완**: 에피소드 **생성**은 로그인 필수로 변경(ADR-11). 참여(콜라보)는 링크+닉네임만으로 계속 가능.

## ADR-11: Supabase Auth — 이메일 로그인 및 보호 경로

- **결정**: Supabase Auth로 **이메일·비밀번호** 회원가입/로그인 제공. 소셜 로그인은 미구현.
- **구현**: `app/login` 로그인·회원가입 폼, `app/auth/callback` 코드 교환(이메일 확인 리다이렉트), Next.js **middleware**에서 `createServerClient`로 쿠키 기반 세션 갱신. 보호 경로 `/create`는 비로그인 시 `/login?next=/create`로 리다이렉트.
- **API**: `create-episode`는 서버에서 `supabase.auth.getUser()`로 사용자 확인 후 `user.id`를 `episodes.creator_id`로 저장. 비로그인 시 401 반환.
- **이유**: SPEC 1항(에피소드 생성은 로그인 사용자만) 충족. 일일 생성 제한을 `creator_id`(auth user id) 기준으로 안정적으로 적용.

이 문서는 기획안 구체화 과정에서의 설계·아키텍처 결정을 기록한 것이며, 구현 시 추가 ADR이 생기면 번호를 이어 붙인다.
