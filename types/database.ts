export type EpisodeStyle = 'webtoon' | 'four_cut' | 'shoujo' | 'action' | 'chibi' | 'noir';
export type BubblePosition = 'left' | 'right' | 'center';
export type EpisodeStatus = 'in_progress' | 'completed';

export interface Database {
  public: {
    Tables: {
      episodes: {
        Row: {
          id: string;
          style: EpisodeStyle;
          character_prompt: string;
          title: string | null;
          summary: string | null;
          status: EpisodeStatus;
          current_turn_index: number;
          creator_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          style: EpisodeStyle;
          character_prompt: string;
          title?: string | null;
          summary?: string | null;
          status?: EpisodeStatus;
          current_turn_index?: number;
          creator_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          style?: EpisodeStyle;
          character_prompt?: string;
          title?: string | null;
          summary?: string | null;
          status?: EpisodeStatus;
          current_turn_index?: number;
          creator_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          episode_id: string;
          nickname: string;
          turn_order: number;
          joined_at: string;
        };
        Insert: {
          id?: string;
          episode_id: string;
          nickname: string;
          turn_order: number;
          joined_at?: string;
        };
        Update: {
          id?: string;
          episode_id?: string;
          nickname?: string;
          turn_order?: number;
          joined_at?: string;
        };
        Relationships: [];
      };
      panels: {
        Row: {
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
        };
        Insert: {
          id?: string;
          episode_id: string;
          order_index: number;
          scene_description: string;
          dialogue?: string | null;
          sound_effect?: string | null;
          bubble_position?: BubblePosition;
          image_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          episode_id?: string;
          order_index?: number;
          scene_description?: string;
          dialogue?: string | null;
          sound_effect?: string | null;
          bubble_position?: BubblePosition;
          image_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      panel_likes: {
        Row: {
          id: string;
          panel_id: string;
          anonymous_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          panel_id: string;
          anonymous_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          panel_id?: string;
          anonymous_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      episode_templates: {
        Row: {
          id: string;
          style: EpisodeStyle;
          scene_description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          style: EpisodeStyle;
          scene_description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          style?: EpisodeStyle;
          scene_description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
  };
}
