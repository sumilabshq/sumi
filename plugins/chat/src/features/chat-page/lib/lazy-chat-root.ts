import { lazy } from "react";

export const LazyChatRoot = lazy(async () => ({ default: (await import("./chat-root.js")).ChatRoot }));
