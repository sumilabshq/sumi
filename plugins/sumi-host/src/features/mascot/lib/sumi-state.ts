export const SUMI_STATES = ["rest", "listening", "working", "waits", "done", "error", "asleep", "surprised"] as const;

export type SumiState = (typeof SUMI_STATES)[number];
