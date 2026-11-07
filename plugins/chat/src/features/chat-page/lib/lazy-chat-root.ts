import { lazy } from "react";

export const LazyChatRoot = lazy(async () => ({ default: (await import("../ui/chat-page/chat-root.js")).ChatRoot }));
