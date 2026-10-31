import { createContext } from "react";

export interface ChatTask {
	readonly chatId: string;
	readonly openTask: (task: string) => void;
}

export const ChatTaskContext = createContext<ChatTask | null>(null);
