import type { ReactNode } from "react";

export interface TabView {
	readonly id: string;
	readonly label: string;
	readonly icon: string;
	readonly title: () => ReactNode;
	readonly side: (() => ReactNode) | null;
}
