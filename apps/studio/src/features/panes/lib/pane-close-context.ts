import { createContext } from "react";

export interface PaneClosing {
	readonly paneId: string;
	readonly isAtTopLeft: boolean;
	readonly isAtTopRight: boolean;
	readonly isClosable: boolean;
	readonly close: () => void;
}

export const PaneCloseContext = createContext<PaneClosing | null>(null);
