import type { ComponentType } from "react";

export interface HomeViewProps {
	readonly tabId: string;
}

export interface FilledHomePage {
	readonly id: string;
	readonly title: string;
	readonly view: ComponentType<HomeViewProps>;
}
