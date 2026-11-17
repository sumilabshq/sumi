import { createElement as h } from "react";
import type { ReactNode } from "react";
import { useChosenView } from "../../lib/use-chosen-view.js";
import type { TabView } from "../../lib/tab-view.js";

export function chosenTitleOf(views: readonly TabView[]): () => ReactNode {
	return function ChosenTabsTitle(): ReactNode {
		const Title = useChosenView(views)?.title ?? null;
		return Title === null ? null : <Title />;
	};
}

export function chosenSideOf(views: readonly TabView[]): () => ReactNode {
	return function ChosenTabsSide(): ReactNode {
		const Side = useChosenView(views)?.side ?? null;
		return Side === null ? null : <Side />;
	};
}
