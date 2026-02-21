# Prompts

이 폴더는 **스토리 생성**(텍스트 LLM)과 **이미지 생성**(나노 바나나)에서 사용할 프롬프트 템플릿을 보관합니다.

- 목표: 프롬프트를 코드에서 쉽게 조합하고, 변경 이력을 깔끔하게 남기기.
- 원칙: `SPEC.md`의 "프롬프트 구성 순서"를 따른다.

## 파일 구성

- `prompts/story_system.md`: 스토리 생성용 시스템 프롬프트
- `prompts/story_user_template.md`: 스토리 생성용 유저 프롬프트 템플릿
- `prompts/image_system.md`: 이미지 생성용 시스템 프롬프트
- `prompts/image_user_template.md`: 이미지 생성용 유저 프롬프트 템플릿
- `prompts/style_presets.json`: 스타일 프리셋(6종)과 prefix

## 플레이스홀더 규칙

템플릿 파일은 코드에서 `{{like_this}}` 형태의 플레이스홀더를 치환해서 사용합니다.

- `{{style_key}}`: 스타일 키(예: `webtoon`)
- `{{style_prefix}}`: 스타일 prefix 문구
- `{{character_prompt}}`: 캐릭터 고정값
- `{{title}}`, `{{summary}}`: 선택값(없으면 빈 문자열)
- `{{panels_so_far_json}}`: 지금까지의 패널 배열(JSON)
- `{{target_panel_count}}`: 생성할 추가 패널 수
- `{{current_panel_json}}`: 현재 패널 1개(JSON)
- `{{prev_image_reference}}`: 직전 이미지 레퍼런스(없으면 빈 문자열)

## 사용 메모

- 스토리 생성은 "구조화 JSON"을 출력하게 강제해서 후처리를 단순화합니다.
- 이미지 생성은 "말풍선/대사/표음"을 이미지에 포함하도록 지시하되, **텍스트 정확도 한계**가 있으므로
  UI에서 "재생성"과 "텍스트 수정" 플로우를 염두에 둡니다.
