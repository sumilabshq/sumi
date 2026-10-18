import { studioAppHostParts } from "../packages/app-host/gateways/app-host-parts/studio.gateway.ts";
import type { AppHostParts } from "../packages/app-host/gateways/app-host-parts/app-host-parts.gateway.ts";
import { PageFactsGateway } from "../packages/app-host/gateways/page-facts/page-facts.gateway.ts";
import type { PageFacts } from "../packages/app-host/shared/schema/page-facts.schema.ts";
import type { StudioState } from "../packages/core/src/engine/studio-state-port.ts";

export const EXACT_WORKSPACE = "Exact tabs";
export const EXACT_COLUMN_PX = 240;
export const EXACT_SHOWN_AT = 6;
export const EXACT_HOVERED_AT = 5;
export const EXACT_DRAGGED_AT = 8;

export function exactAppHostParts(state: StudioState): AppHostParts {
	localStorage.setItem(
		`widgetarium-studio-tabs-column:${EXACT_WORKSPACE}`,
		JSON.stringify({ isShown: true, isFull: true, fullPx: EXACT_COLUMN_PX, side: "end" }),
	);
	state.show("browser");
	const parts = studioAppHostParts({
		studioState: state,
		workspace: EXACT_WORKSPACE,
		pageFactsGateway: new BoardPageFactsGateway(),
	});
	const { hostTabs } = parts;
	const first = hostTabs.now().tabs.map((tab) => tab.id);
	const opened = BOARD_TABS.map((tab, at) =>
		hostTabs.open({ app: "browser", pageId: `page-${at + 1}`, isPinned: tab.isPinned }),
	);
	first.forEach((id) => hostTabs.close(id));
	const shown = opened[EXACT_SHOWN_AT];

	if (shown) {
		hostTabs.show(shown.id);
	}

	return parts;
}

interface BoardTab {
	readonly title: string;
	readonly host: string | null;
	readonly favicon: string | null;
	readonly isPinned: boolean;
	readonly status: "reading" | "waiting" | "cannot-look" | null;
}

const FAVICON_OF = (fill: string): string =>
	`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21"><rect width="21" height="21" rx="6" fill="${fill}"/></svg>`)}`;

const BOARD_TABS: readonly BoardTab[] = [
	{ title: "Canvas", host: "app", favicon: null, isPinned: true, status: null },
	{ title: "Canvas", host: "design", favicon: null, isPinned: true, status: null },
	{ title: "Code", host: "web", favicon: null, isPinned: true, status: null },
	{ title: "Code", host: "api", favicon: null, isPinned: true, status: null },
	{ title: "Diff", host: null, favicon: null, isPinned: true, status: null },
	{ title: "Terminal", host: "web", favicon: null, isPinned: false, status: null },
	{ title: "Jira", host: "sprint-14-board", favicon: FAVICON_OF("#1868DB"), isPinned: false, status: "reading" },
	{ title: "Slack", host: "design-review", favicon: FAVICON_OF("#4A154B"), isPinned: false, status: "waiting" },
	{ title: "Vite docs", host: "config-reference", favicon: FAVICON_OF("#7C5CFC"), isPinned: false, status: null },
	{ title: "GitHub", host: "pull-request-412", favicon: FAVICON_OF("#1F2328"), isPinned: false, status: "cannot-look" },
	{ title: "Linear", host: "inbox", favicon: FAVICON_OF("#5E6AD2"), isPinned: false, status: null },
];

class BoardPageFactsGateway extends PageFactsGateway {
	private readonly facts: readonly PageFacts[] = BOARD_TABS.map((tab, at) => ({
		pageId: `page-${at + 1}`,
		title: tab.title,
		url: tab.host === null ? "" : `https://${tab.host}/`,
		favicon: tab.favicon,
		isInkReading: tab.status === "reading",
		isAskWaiting: tab.status === "waiting",
		isClosedToInk: tab.status === "cannot-look",
	}));

	pages(): readonly PageFacts[] {
		return this.facts;
	}

	watch(): () => void {
		return () => undefined;
	}

	showPage(): void {}

	stop(): void {}
}
