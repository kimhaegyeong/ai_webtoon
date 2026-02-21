# Examples

아래는 코드/실행 환경에서 프롬프트를 조합했을 때의 **예시**입니다.

## 스토리 생성 (LLM)

- system: `prompts/story_system.md`
- user: `prompts/story_user_template.md` 치환 결과

예시 치환값:
- `{{style_key}}`: `webtoon`
- `{{title}}`: `"편의점에서 생긴 일"`
- `{{summary}}`: `"야근 후 편의점에 들른 주인공이 이상한 알바생을 만난다"`
- `{{character_prompt}}`: `"갈색 단발머리의 17살 여고생. 교복, 밝고 엉뚱한 성격."`
- `{{target_panel_count}}`: `3`
- `{{panels_so_far_json}}`: (이미 생성된 3칸)

권장 출력(JSON):
- `{"panels": [{"scene": "...", "dialogue": "...", "sfx": "...", "bubble_position": "left"}, ...]}`

## 이미지 생성 (나노 바나나)

- system: `prompts/image_system.md`
- user: `prompts/image_user_template.md` 치환 결과

예시 치환값:
- `{{style_prefix}}`: 스타일 프리셋 prefix
- `{{prev_image_reference}}`: "REFERENCE IMAGE: <url or base64>" (첫 칸이면 빈 문자열)
- `{{current_panel_json}}`:

```json
{
  "scene": "밤의 편의점. 주인공이 문을 열고 들어오며 종이 울린다. 카메라는 약간 아래에서 위로.",
  "dialogue": "(작게) 오늘도 야근...",
  "sfx": "딩동",
  "bubble_position": "top"
}
```
