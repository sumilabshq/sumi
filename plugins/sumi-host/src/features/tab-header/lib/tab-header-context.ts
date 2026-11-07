import { createContext, useContext } from "react";
import type { ComponentType, ReactNode } from "react";
import { NoHeaderAction, NoHeaderActions } from "./no-tab-header.js";

export interface HeaderActionProps {
	readonly label: string;
	readonly icon: string;
	readonly isDone?: boolean;
	readonly isOff?: boolean;
	readonly onPress: () => void;
}

export interface HeaderActionsProps {
	readonly children: ReactNode;
}

export interface TabHeader {
	readonly Actions: ComponentType<HeaderActionsProps>;
	readonly Action: ComponentType<HeaderActionProps>;
}

export const TabHeaderContext = createContext<TabHeader>({
	Actions: NoHeaderActions,
	Action: NoHeaderAction,
});

export function useTabHeader(): TabHeader {
	return useContext(TabHeaderContext);
}
