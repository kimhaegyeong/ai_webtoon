export type { EpisodeStyle, BubblePosition, EpisodeStatus, Database } from './database';

import type { Database } from './database';

export type Episode = Database['public']['Tables']['episodes']['Row'];
export type Participant = Database['public']['Tables']['participants']['Row'];
export type Panel = Database['public']['Tables']['panels']['Row'];
export type PanelLike = Database['public']['Tables']['panel_likes']['Row'];
export type EpisodeLike = Database['public']['Tables']['episode_likes']['Row'];
export type EpisodeReview = Database['public']['Tables']['episode_reviews']['Row'];
