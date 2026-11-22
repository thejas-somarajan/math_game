export type Difficulty = {
  choices: boolean;
  cap: number;
  decimals: boolean;
  ammo: number;
};
export type Profile = {
  id: string;
  name: string;
  assigned: number[];
  locks: Record<string, boolean>;
  stars: Record<string, number>;
  difficulty: Difficulty;
  autoProgress: boolean;
  jet: number;
};
export type Attempt = {
  id: string;
  studentId: string;
  sessionId: string;
  level: number;
  templateId: string;
  skill: string;
  trap: string;
  params: number[];
  equation: string;
  answer: number;
  given: number;
  correct: boolean;
  first: boolean;
  scaffold: string;
  timeMs: number;
  timestamp: number;
  exitTicket?: number;
};
export type Session = {
  id: string;
  studentId: string;
  startedAt: number;
  endedAt?: number;
  duration: number;
  levels: number[];
  results: { level: number; stars: number }[];
  practice: boolean;
  exitScores: Record<string, number>;
};
export type Settings = {
  pinHash: string;
  salt: string;
  tutorCredentialRevision?: number;
  sessionLength: number;
  readAloud: boolean;
  music: number;
  sound: number;
  reducedMotion: boolean;
  textSize: number;
  tutorial: boolean;
};
export type AppData = {
  version: 1;
  profiles: Profile[];
  selected: string;
  settings: Settings;
  attempts: Attempt[];
  sessions: Session[];
  checkpoints: Record<string, unknown>;
};
export type Level = {
  id: number;
  module: number;
  name: string;
  theme: string;
  skill: string;
  subtitle: string;
  colour: string;
  boss: boolean;
  bossConfig: {
    name: string;
    health: number;
    fireInterval: number;
    bulletSpeed: number;
    bulletCount: number;
    movePeriod: number;
    moveAmplitude: number;
    aimedShots: boolean;
    art: number;
  };
  ammoCapacity: number;
  segments: number[];
  duration: number;
  waveEvery: number;
  event: string;
};
export const defaultDifficulty: Difficulty = {
  choices: true,
  cap: 100,
  decimals: true,
  ammo: 1,
};
export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
export const newProfile = (name: string): Profile => ({
  id: uid(),
  name: name.trim().slice(0, 24),
  assigned: [1],
  locks: {},
  stars: {},
  difficulty: { ...defaultDifficulty },
  autoProgress: true,
  jet: 0,
});
export const isAvailable = (p: Profile, level: number) =>
  p.assigned.includes(level) &&
  p.locks[level] !== true &&
  (![4, 14].includes(level) || p.difficulty.decimals);
export function award(p: Profile, level: number, stars: number) {
  p.stars[level] = Math.max(p.stars[level] || 0, stars);
  if (
    stars >= 2 &&
    p.autoProgress &&
    level < 15 &&
    p.locks[level + 1] !== true &&
    !p.assigned.includes(level + 1)
  )
    p.assigned.push(level + 1);
}
export const rating = (accuracy: number, lives: number) =>
  accuracy >= 0.9 && lives >= 2 ? 3 : accuracy >= 0.7 ? 2 : 1;
