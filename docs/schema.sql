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

-- ============================================================
-- 에피소드 시작 템플릿 (주사위 UX)
-- ============================================================

CREATE TABLE IF NOT EXISTS episode_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style       TEXT NOT NULL,             -- webtoon | four_cut | shoujo | action | chibi | noir
  scene_description TEXT NOT NULL,       -- 장면 설명 (PanelForm sceneDescription 자동 입력용)
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE episode_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read episode_templates" ON episode_templates FOR SELECT USING (true);

-- 시드 데이터: 스타일별 20개씩
INSERT INTO episode_templates (style, scene_description) VALUES
-- webtoon (20)
('webtoon', '교실 창가, 오후 햇살 속에 주인공이 혼자 책을 읽고 있다'),
('webtoon', '학교 옥상, 바람이 부는 가운데 두 사람이 처음 마주친다'),
('webtoon', '편의점 앞 벤치, 밤늦게 우연히 같은 자리에 앉게 된 두 사람'),
('webtoon', '비 오는 버스정류장, 우산 하나를 나눠 쓰는 낯선 두 사람'),
('webtoon', '도서관 서가 사이, 같은 책을 동시에 잡으며 눈이 마주친다'),
('webtoon', '학교 복도, 떨어진 물건을 주워주다 서로 손이 닿는다'),
('webtoon', '방과 후 빈 교실, 혼자 남아 악기를 연습하는 모습을 목격한다'),
('webtoon', '계단 끝 창가, 멀리서 누군가를 바라보며 혼자 웃고 있다'),
('webtoon', '카페 창가 자리, 주문을 하다 실수로 영수증이 바뀐다'),
('webtoon', '공원 벤치, 길을 잃은 강아지를 함께 돌보게 된다'),
('webtoon', '동아리방, 새 부원이 들어오는 날 어색한 첫 만남'),
('webtoon', '지하철 안, 같은 이어폰 잭을 찾다 서로의 플레이리스트를 보게 된다'),
('webtoon', '학교 옥상 텃밭, 물을 주다 갑자기 쏟아지는 소나기'),
('webtoon', '야간 자율학습 후, 빈 교실에 남은 두 사람이 처음 대화를 나눈다'),
('webtoon', '체육관, 연습 중 넘어진 상대를 잡아주며 시선이 엇갈린다'),
('webtoon', '학교 축제 준비 중, 무대 뒤편에서 긴장한 모습을 들킨다'),
('webtoon', '미술실, 옆자리에 앉아 서로의 그림을 몰래 훔쳐본다'),
('webtoon', '점심시간 혼자 먹는 모습을 보고 용기 내어 옆에 앉는다'),
('webtoon', '시험 전날 밤, 같은 스터디카페에서 우연히 마주친다'),
('webtoon', '졸업식날 복도, 마지막으로 이름을 부르며 뒤돌아보는 장면'),
-- four_cut (20)
('four_cut', '아침에 일어났더니 지각이다. 허둥지둥 교복을 입는다'),
('four_cut', '점심 메뉴를 고르다 친구와 의견이 충돌한다'),
('four_cut', '수업 중 잠들었다가 선생님에게 걸린다'),
('four_cut', '좋아하는 과자를 혼자 먹으려다 들킨다'),
('four_cut', '숙제를 까먹고 학교에 왔다. 핑계를 생각 중이다'),
('four_cut', '우산을 안 챙겼는데 갑자기 비가 쏟아진다'),
('four_cut', '다이어트 결심을 했지만 맛있는 냄새에 흔들린다'),
('four_cut', 'SNS에 올린 글이 예상치 못한 반응을 얻는다'),
('four_cut', '길을 알려주다 자신도 길을 잃어버린다'),
('four_cut', '알람을 10번 끄고 결국 지각했다'),
('four_cut', '친구에게 비밀을 말했더니 이미 소문이 나 있다'),
('four_cut', '자판기에서 음료수가 두 개 나온다. 행운인가 고장인가'),
('four_cut', '급하게 밥을 먹다 친구랑 부딪혀 옷에 쏟는다'),
('four_cut', '새 신발을 샀는데 첫날부터 물이 들어온다'),
('four_cut', '시험에서 아는 문제만 나왔다고 생각했는데 결과가 처참하다'),
('four_cut', '추운 날 따뜻한 자리를 발견했지만 이미 누군가 앉아 있다'),
('four_cut', '용기 내어 고백했더니 상대가 이미 알고 있었다'),
('four_cut', '빨래를 너무 오래 돌렸더니 옷이 줄어들었다'),
('four_cut', '청소를 하다 오래된 일기장을 발견한다'),
('four_cut', '단톡방에서 잘못된 그룹에 메시지를 보낸다'),
-- shoujo (20)
('shoujo', '벚꽃 나무 아래, 꽃잎이 흩날리는 속에서 처음 눈이 마주친다'),
('shoujo', '봄비 속, 교복 소매에 빗물이 튀고 상대가 손수건을 건넨다'),
('shoujo', '교실 창가에 노을이 지는 시간, 혼자 앉아 편지를 쓰고 있다'),
('shoujo', '계단에서 발을 헛디뎌 넘어지려는 순간 손목을 잡혀 구해진다'),
('shoujo', '음악실 복도, 피아노 선율이 새어 나오는 문 앞에 멈춰선다'),
('shoujo', '도서관에서 같은 책을 빌리러 갔다가 이름이 적힌 대출 목록을 본다'),
('shoujo', '학교 축제 밤, 불꽃놀이 빛 속에서 서로의 얼굴을 바라본다'),
('shoujo', '버스 안, 흔들릴 때마다 어깨가 닿으면서 서서히 얼굴이 빨개진다'),
('shoujo', '옥상, 해가 지는 하늘 아래 두 사람의 긴 그림자가 겹친다'),
('shoujo', '우연히 바꿔 쓰게 된 우산, 돌려주러 갔다가 빗속에서 마주친다'),
('shoujo', '꽃집 앞, 좋아하는 꽃을 고르는 상대를 몰래 바라본다'),
('shoujo', '수영장 옆 벤치, 물기가 마르는 동안 조용히 이름을 불린다'),
('shoujo', '눈 오는 날 등교길, 숨결이 하얗게 피어오르며 이름을 부른다'),
('shoujo', '수학여행 밤, 별이 가득한 하늘 아래 나란히 누워 이야기한다'),
('shoujo', '해가 뜨는 새벽, 아무도 없는 교정에서 두 사람만의 시간'),
('shoujo', '졸업 앨범 사진을 찍던 날, 혼자 남은 상대의 옆에 슬며시 선다'),
('shoujo', '교실 청소 중 함께 창문을 여는 순간, 봄바람이 커튼을 날린다'),
('shoujo', '아픈 날 교실로 과제를 가져다준 상대의 체온이 느껴진다'),
('shoujo', '문화제 무대 뒤, 긴장한 상대의 손을 살짝 쥐어준다'),
('shoujo', '마지막 수업 날, 창문에 손바닥을 대며 인사하는 뒷모습'),
-- action (20)
('action', '폐창고 지붕 위, 두 라이벌이 처음으로 맞닥뜨린다'),
('action', '비 오는 밤 골목, 여러 명에게 쫓기다 막다른 곳에 몰린다'),
('action', '거대 로봇이 도시에 나타났다. 주인공이 홀로 맞선다'),
('action', '격투 대회 결승, 서로를 존중하며 주먹을 맞댄다'),
('action', '불타는 건물에서 탈출하던 중 동료가 발목을 잡힌다'),
('action', '운동장, 최강자에게 도전장을 내미는 신입생'),
('action', '고속도로 위, 오토바이를 타고 적을 추격한다'),
('action', '지하 비밀기지, 적의 함정에 걸려 갇힌다'),
('action', '결전 전날 밤, 홀로 특훈 중인 주인공의 뒷모습'),
('action', '패배 직후, 땅에 쓰러져 하늘을 바라보며 다시 일어선다'),
('action', '강을 건너다 다리가 끊어진다. 순간 판단이 필요하다'),
('action', '숨겨진 능력이 처음 폭발하는 순간, 주변이 뒤흔들린다'),
('action', '마지막 에너지를 쥐어짜 강적에게 결정타를 날린다'),
('action', '팀이 전멸 위기, 주인공 혼자 모두를 지켜야 한다'),
('action', '제자가 처음으로 스승을 넘어서는 순간'),
('action', '오랜 숙적과 등을 맞대고 웃으며 함께 싸운다'),
('action', '도시 전체를 지키기 위해 자신을 희생하려는 순간'),
('action', '작전 시작 직전, 팀원들이 각자의 결의를 다진다'),
('action', '무너지는 빌딩 꼭대기에서 마지막 결전'),
('action', '변신이 풀린 채 적에게 정체가 드러난다'),
-- chibi (20)
('chibi', '학교 급식 줄, 좋아하는 메뉴가 나온 날 눈이 반짝인다'),
('chibi', '체육 시간, 달리기에서 꼴찌를 했지만 씩씩하게 웃는다'),
('chibi', '시험지를 돌려받다 100점 대신 다른 숫자가 적혀 있다'),
('chibi', '좋아하는 친구에게 초콜릿을 건네려다 계속 실패한다'),
('chibi', '귀여운 고양이를 발견하고 쫓아가다 길을 잃는다'),
('chibi', '빵집 앞에서 갓 구운 빵 냄새에 이성을 잃는다'),
('chibi', '비밀 일기를 발견했는데 친구에게 들켜버린다'),
('chibi', '처음 요리에 도전했는데 예상과 다른 결과물이 나온다'),
('chibi', '저금통을 열었더니 생각보다 훨씬 적은 금액이 들어 있다'),
('chibi', '졸리다며 버티다가 수업 중에 꾸벅꾸벅 조는 모습'),
('chibi', '아이돌 사진을 몰래 보다가 짝꿍에게 발각된다'),
('chibi', '우산을 잃어버렸는데 공교롭게도 비가 쏟아진다'),
('chibi', '생일 케이크 촛불을 끄다 크림이 얼굴에 묻는다'),
('chibi', '놀이터 미끄럼틀에서 내려오다 바지가 걸린다'),
('chibi', '새로 산 스티커를 잘못된 곳에 붙여버린다'),
('chibi', '친구의 도시락을 훔쳐 먹다 눈이 딱 마주친다'),
('chibi', '게임에서 이기고 너무 좋아하다 의자에서 떨어진다'),
('chibi', '앞머리를 직접 잘라보려다 참사가 벌어진다'),
('chibi', '강아지한테 간식을 빼앗기고 뒤쫓아 다닌다'),
('chibi', '교복 단추를 잘못 채우고 하루 종일 모르고 다닌다'),
-- noir (20)
('noir', '빗속 부두, 담배 연기 사이로 낯선 의뢰인이 다가온다'),
('noir', '형광등 하나만 켜진 탐정 사무소, 누군가 문을 두드린다'),
('noir', '뒷골목, 폐쇄된 공장 안에서 단서 하나를 발견한다'),
('noir', '비 오는 밤 기차역, 분명 죽은 줄 알았던 사람이 서 있다'),
('noir', '경찰 조사실, 차가운 불빛 아래 침묵이 길어진다'),
('noir', '오래된 가방 속, 이름 모를 사진과 편지가 발견된다'),
('noir', '새벽 거리, 미행을 눈치채고 골목으로 뛰어든다'),
('noir', '술집 한구석, 오랜 파트너가 다른 편에 서 있음을 알게 된다'),
('noir', '빌딩 옥상, 범인과 단둘이 마지막으로 마주한다'),
('noir', '신문 1면에 자신의 이름이 용의자로 올라와 있다'),
('noir', '창고 구석, 숨겨진 문서가 모든 것을 바꿀 진실을 담고 있다'),
('noir', '낡은 사진 속, 사건의 열쇠가 되는 얼굴을 발견한다'),
('noir', '형사가 단서를 따라갔더니 자신의 집 앞에 도달한다'),
('noir', '밤안개 속 공원, 약속 장소에 의뢰인 대신 낯선 편지만 있다'),
('noir', '병원 복도, 목격자가 증언 직전에 갑자기 기억을 잃는다'),
('noir', '전화 통화 중 배경 소리에서 범행 현장의 단서를 듣는다'),
('noir', '지하 주차장, 표적을 놓친 순간 뒤에서 발소리가 들린다'),
('noir', '심문 도중 상대가 아는 것이 너무 많다는 걸 깨닫는다'),
('noir', '낡은 호텔 방, 체크아웃하지 않은 투숙객의 흔적을 조사한다'),
('noir', '마지막 증거가 담긴 USB를 손에 쥔 채 쫓기고 있다');
