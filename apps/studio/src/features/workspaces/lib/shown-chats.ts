import { createContext } from "react";

export const ShownChatsContext = createContext<ReadonlySet<string> | null>(null);

export const ChatWindowsContext = createContext<ReadonlyMap<string, string>>(new Map());
