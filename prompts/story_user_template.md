Create {{target_panel_count}} new panels for this episode.

Episode context:
- style_key: {{style_key}}
- title: {{title}}
- summary: {{summary}}
- character_prompt: {{character_prompt}}

Panels so far (JSON array):
{{panels_so_far_json}}

Return JSON with this exact shape:
{
  "panels": [
    {
      "scene": "...",
      "dialogue": "...",
      "sfx": "...",
      "bubble_position": "left|right|center|top|bottom"
    }
  ]
}
