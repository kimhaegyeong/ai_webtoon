// 에피소드 스타일 프리셋
export type EpisodeStyle = 'webtoon' | 'four_cut' | 'shoujo' | 'action' | 'chibi' | 'noir';

// 말풍선 위치
export type BubblePosition = 'left' | 'right' | 'center';

// 에피소드 상태
export type EpisodeStatus = 'in_progress' | 'completed';

export interface Episode {
  id: string;
  style: EpisodeStyle;
  character_prompt: string;
  title: string | null;
  summary: string | null;
  status: EpisodeStatus;
  current_turn_index: number;
  created_at: string;
}

export interface Participant {
  id: string;
  episode_id: string;
  nickname: string;
  turn_order: number;
  joined_at: string;
}

export interface Panel {
  id: string;
  episode_id: string;
  order_index: number;
  scene_description: string;
  dialogue: string | null;
  sound_effect: string | null;
  bubble_position: BubblePosition;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PanelLike {
  id: string;
  panel_id: string;
  anonymous_id: string;
  created_at: string;
}
