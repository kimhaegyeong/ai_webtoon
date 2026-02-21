-- AI 릴레이 만화 MVP 스키마

-- 에피소드
CREATE TABLE IF NOT EXISTS episodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style           TEXT NOT NULL,
  character_prompt TEXT NOT NULL,
  title           TEXT,
  summary         TEXT,
  status          TEXT NOT NULL DEFAULT 'in_progress',
  current_turn_index INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 참여자
CREATE TABLE IF NOT EXISTS participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id      UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  nickname        TEXT NOT NULL,
  turn_order      INT NOT NULL,
  joined_at       TIMESTAMPTZ DEFAULT now()
);

-- 칸(패널)
CREATE TABLE IF NOT EXISTS panels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id      UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  order_index     INT NOT NULL,
  scene_description TEXT NOT NULL,
  dialogue        TEXT,
  sound_effect    TEXT,
  bubble_position TEXT NOT NULL DEFAULT 'center',
  image_url       TEXT,
  created_by      UUID REFERENCES participants(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 좋아요
CREATE TABLE IF NOT EXISTS panel_likes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id        UUID NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
  anonymous_id    TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(panel_id, anonymous_id)
);

-- RLS 활성화
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_likes ENABLE ROW LEVEL SECURITY;

-- MVP: 공개 읽기/쓰기 정책 (익명 참여 전제)
CREATE POLICY "public read episodes" ON episodes FOR SELECT USING (true);
CREATE POLICY "public insert episodes" ON episodes FOR INSERT WITH CHECK (true);
CREATE POLICY "public update episodes" ON episodes FOR UPDATE USING (true);

CREATE POLICY "public read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "public insert participants" ON participants FOR INSERT WITH CHECK (true);

CREATE POLICY "public read panels" ON panels FOR SELECT USING (true);
CREATE POLICY "public insert panels" ON panels FOR INSERT WITH CHECK (true);

CREATE POLICY "public read panel_likes" ON panel_likes FOR SELECT USING (true);
CREATE POLICY "public insert panel_likes" ON panel_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete panel_likes" ON panel_likes FOR DELETE USING (true);

-- Storage 버킷 생성 (SQL Editor에서 실행)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('panels', 'panels', true);
