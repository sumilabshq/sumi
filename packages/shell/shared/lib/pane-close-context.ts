import { createContext } from "react";

export interface PaneClosing {
	readonly paneId: string;
	readonly isAtTopRight: boolean;
	readonly close: () => void;
}

export const PaneCloseContext = createContext<PaneClosing | null>(null);
