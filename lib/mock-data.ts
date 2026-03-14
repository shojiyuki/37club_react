// ─── Mock data for 37Club prototype ──────────────────────────────────────────

export type FollowState = "none" | "following" | "mutual";

export interface MockUser {
  id: string;
  name: string;
  /** Follow state from the current user's perspective */
  followState: FollowState;
}

export interface MockPost {
  id: string;
  user: MockUser;
  /** Image URI – using picsum for placeholder */
  imageUri: string;
  caption: string;
  topicId: string;
}

// Stable picsum seeds for deterministic images
const PICSUM = (seed: number, size = 400) =>
  `https://picsum.photos/seed/${seed}/${size}/${size}`;

export const MOCK_USERS: MockUser[] = [
  { id: "u1",  name: "yuki_37",   followState: "mutual" },
  { id: "u2",  name: "hana_club", followState: "following" },
  { id: "u3",  name: "taro_x",    followState: "none" },
  { id: "u4",  name: "mio_run",   followState: "mutual" },
  { id: "u5",  name: "kenji_s",   followState: "none" },
  { id: "u6",  name: "rina_w",    followState: "following" },
  { id: "u7",  name: "sota_m",    followState: "mutual" },
  { id: "u8",  name: "ayaka_k",   followState: "none" },
  { id: "u9",  name: "daisuke",   followState: "none" },
  { id: "u10", name: "nana_37",   followState: "mutual" },
  { id: "u11", name: "ryu_t",     followState: "none" },
  { id: "u12", name: "saki_h",    followState: "following" },
];

export const MOCK_POSTS: MockPost[] = [
  { id: "p1",  user: MOCK_USERS[0],  imageUri: PICSUM(10),  caption: "赤いバッグで来たよ！",    topicId: "t1" },
  { id: "p2",  user: MOCK_USERS[1],  imageUri: PICSUM(20),  caption: "赤いスニーカー",          topicId: "t1" },
  { id: "p3",  user: MOCK_USERS[2],  imageUri: PICSUM(30),  caption: "赤いマフラー持参",        topicId: "t1" },
  { id: "p4",  user: MOCK_USERS[3],  imageUri: PICSUM(40),  caption: "サングラスかけてきた",    topicId: "t2" },
  { id: "p5",  user: MOCK_USERS[4],  imageUri: PICSUM(50),  caption: "上野公園到着！",          topicId: "t2" },
  { id: "p6",  user: MOCK_USERS[5],  imageUri: PICSUM(60),  caption: "西郷さんと一緒に",        topicId: "t2" },
  { id: "p7",  user: MOCK_USERS[6],  imageUri: PICSUM(70),  caption: "東京タワー最高",          topicId: "t3" },
  { id: "p8",  user: MOCK_USERS[7],  imageUri: PICSUM(80),  caption: "白Tシャツで集合",         topicId: "t3" },
  { id: "p9",  user: MOCK_USERS[8],  imageUri: PICSUM(90),  caption: "鎌倉の朝は気持ちいい",    topicId: "t4" },
  { id: "p10", user: MOCK_USERS[9],  imageUri: PICSUM(100), caption: "本を持ってきたよ",        topicId: "t4" },
  { id: "p11", user: MOCK_USERS[10], imageUri: PICSUM(110), caption: "大阪城最高すぎ",          topicId: "t5" },
  { id: "p12", user: MOCK_USERS[11], imageUri: PICSUM(120), caption: "帽子コーデ決まった",      topicId: "t5" },
];

export const FOLLOWING_POST_IDS = new Set(["p1", "p4", "p7", "p10"]);

// ─── Chat messages ────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  senderId: string; // user id or "me"
  text: string;
}

/** Per-user chat history (keyed by user id). "me" = current user. */
export const MOCK_CHAT_BY_USER: Record<string, ChatMessage[]> = {
  u1: [
    { id: "u1-m1", senderId: "u1", text: "今日のお題、来れそう？" },
    { id: "u1-m2", senderId: "me", text: "行くよ！渋谷だよね" },
    { id: "u1-m3", senderId: "u1", text: "そう！ハチ公前で会おう" },
    { id: "u1-m4", senderId: "me", text: "了解、赤いもの持っていく" },
    { id: "u1-m5", senderId: "u1", text: "楽しみ！" },
  ],
  u4: [
    { id: "u4-m1", senderId: "me",  text: "サングラス似合ってるね" },
    { id: "u4-m2", senderId: "u4",  text: "ありがとう！上野楽しかった" },
    { id: "u4-m3", senderId: "me",  text: "また次のSETで会おう" },
    { id: "u4-m4", senderId: "u4",  text: "絶対行く！" },
  ],
  u7: [
    { id: "u7-m1", senderId: "u7",  text: "東京タワー来てる？" },
    { id: "u7-m2", senderId: "me",  text: "今向かってる！" },
    { id: "u7-m3", senderId: "u7",  text: "正面入口で待ってるよ" },
    { id: "u7-m4", senderId: "me",  text: "5分で着く" },
    { id: "u7-m5", senderId: "u7",  text: "了解〜" },
    { id: "u7-m6", senderId: "me",  text: "着いた！" },
  ],
  u10: [
    { id: "u10-m1", senderId: "u10", text: "鎌倉の本屋さん行った？" },
    { id: "u10-m2", senderId: "me",  text: "まだ！おすすめある？" },
    { id: "u10-m3", senderId: "u10", text: "駅近の古本屋が最高だよ" },
  ],
};

// Legacy flat list (kept for backward compat)
export const MOCK_CHAT_MESSAGES: ChatMessage[] = MOCK_CHAT_BY_USER["u1"] ?? [];
