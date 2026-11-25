import { createContext } from "react";

export interface SettingsDetail {
	readonly title: string;
	readonly onBack: () => void;
}

export const SettingsDetailContext = createContext<(detail: SettingsDetail | null) => void>(() => undefined);
