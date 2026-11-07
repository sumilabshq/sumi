import { createContext, useContext } from "react";
import type { ComponentType } from "react";
import { NoTabFace } from "./no-tab-face.js";

export interface TabFaceProps {
	readonly art: string;
	readonly favicon: string | null;
	readonly title: string;
	readonly address: string | null;
	readonly mark: "none" | "running" | "unread";
}

export const TabFaceContext = createContext<ComponentType<TabFaceProps>>(NoTabFace);

export function useTabFace(): ComponentType<TabFaceProps> {
	return useContext(TabFaceContext);
}
