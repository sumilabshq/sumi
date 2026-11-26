import { createContext } from "react";

export interface SectionFocus {
	readonly pageId: string;
	readonly sectionId: string;
}

export const SettingsFocusContext = createContext<SectionFocus | null>(null);
