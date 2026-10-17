import type { HostTab, HostTabsMoment } from "../../../shared/lib/host-tabs/host-tabs.js";
import type { AppChoice, AppKind, AppTab, AppTabState, TabStatus } from "../../../shared/schema/app-tab.schema.js";
import type { PageFacts } from "../../../shared/schema/page-facts.schema.js";
import { pagesOfTabs } from "./tab-pages.js";

export const APP_CHOICES: readonly AppChoice[] = [
	{
		app: "canvas",
		label: "Canvas",
		icon: "pen-tool",
	},
	{
		app: "browser",
		label: "Browser",
		icon: "globe",
	},
];

const NEW_PAGE = "New tab";

export function shownTabIdOf({ tabs, shownId }: HostTabsMoment, shownApp: AppKind | null): string | null {
	if (shownApp === null) {
		return null;
	}

	const remembered = tabs.find((tab) => tab.id === shownId && tab.app === shownApp);
	return (remembered ?? tabs.find((tab) => tab.app === shownApp))?.id ?? null;
}

export function tabRowsOf(
	moment: HostTabsMoment,
	pages: readonly PageFacts[],
	shownApp: AppKind | null,
): readonly AppTabState[] {
	const shownId = shownTabIdOf(moment, shownApp);
	const pageOf = pagesOfTabs(moment.tabs, pages);
	return moment.tabs.map((tab) => ({
		...faceOf(tab, pageOf.get(tab.id) ?? null, ordinalOf(moment.tabs, tab)),
		isShown: tab.id === shownId,
	}));
}

function faceOf(tab: HostTab, page: PageFacts | null, ordinal: number): AppTab {
	const choice = choiceOf(tab.app);
	return {
		id: tab.id,
		app: tab.app,
		title: page === null ? choice.label : page.title || NEW_PAGE,
		subtitle: page === null ? ordinalSaid(ordinal) : hostOf(page.url),
		icon: choice.icon,
		favicon: page?.favicon ?? null,
		status: page === null ? null : statusOf(page),
		isPinned: tab.isPinned,
	};
}

function choiceOf(app: AppKind): AppChoice {
	const choice = APP_CHOICES.find((one) => one.app === app);

	if (!choice) {
		throw new Error(`the host offers no app "${app}"`);
	}

	return choice;
}

function ordinalOf(tabs: readonly HostTab[], tab: HostTab): number {
	return tabs.filter((one) => one.app === tab.app).indexOf(tab) + 1;
}

function ordinalSaid(ordinal: number): string | null {
	return ordinal === 1 ? null : String(ordinal);
}

function statusOf({ isInkReading, isAskWaiting, isClosedToInk }: PageFacts): TabStatus | null {
	if (isInkReading) {
		return "reading";
	}

	if (isAskWaiting) {
		return "waiting";
	}

	return isClosedToInk ? "cannot-look" : null;
}

function hostOf(url: string): string | null {
	try {
		return new URL(url).host || null;
	} catch {
		return null;
	}
}
