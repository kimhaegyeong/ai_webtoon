# AI 릴레이 만화 (ai_webtoon)

OKKY 바이브코딩 해커톤 MVP 프로젝트.

현재 저장소는 **기획/스펙(SPEC/ADR) 중심**으로 구성되어 있으며, 구현 코드는 아직 추가되지 않았습니다.
이 문서는 추후 React/Vite/Supabase 기반 구현을 위한 **개발 환경 준비 절차**를 정리합니다.

## 사전 준비물

- Node.js 18+ 권장 (현재 개발자 PC 확인: Node 22.x)
- npm 9+ 또는 pnpm/yarn 중 택1 (프로젝트 확정 시 고정)
- Git
- Supabase 프로젝트 (DB/Realtime/Storage)
- (선택) Vercel 계정 (배포/환경변수 관리)

## 환경 변수

1) `.env.example`을 참고해 `.env`를 생성합니다.

```bash
cp .env.example .env
```

2) Supabase 프로젝트에서 아래 값을 채웁니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3) 서버에서만 사용하는 키(클라이언트 노출 금지)

- `SUPABASE_SERVICE_ROLE_KEY` (필요 시)
- `GEMINI_API_KEY`
- `CLAUDE_API_KEY`

> 참고: `VITE_` prefix가 붙은 값은 Vite 클라이언트 번들에 포함될 수 있으므로
> **public(노출 가능) 값만** 둡니다. (ADR-5 참고)

## 로컬 개발 실행 (구현 코드 추가 후)

아직 앱 코드가 없어서 `npm run dev` 등은 동작하지 않습니다.

코드가 추가되면 아래 형태로 정리할 예정입니다.

- 의존성 설치: `npm install`
- 개발 서버: `npm run dev`
- 타입/린트/테스트: `npm run typecheck`, `npm run lint`, `npm test` (도입 시)

## 문서

- 기능 요구사항: `SPEC.md`
- 아키텍처/설계 결정: `ADR.md`
- 사전 기획안: `docs/사전 개발 기획안.md`

