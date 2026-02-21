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

## ADR-4: 스토리 자동완성 — Claude API

- **결정**: "AI에게 넘기기" 시 Claude로 남은 칸의 장면·대사·표음 생성 후, 칸별로 Gemini 호출.
- **이유**: 스토리 연속성·톤 유지에 강점. 생성 프롬프트를 유저가 수정한 뒤 Gemini에 넘기는 플로우 확장 가능.

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

이 문서는 기획안 구체화 과정에서의 설계·아키텍처 결정을 기록한 것이며, 구현 시 추가 ADR이 생기면 번호를 이어 붙인다.
