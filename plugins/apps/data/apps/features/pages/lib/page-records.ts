import type { AppFace } from "../../../shared/schema/app.schema.js";
import type { AppPage, PageTitle, RememberedPageTitle } from "../../../shared/schema/page.schema.js";

export interface RecordedPage {
	readonly id: string;
	readonly title?: string | undefined;
	readonly favicon?: string | undefined;
	readonly actions?: AppPage["actions"] | undefined;
}

export interface PageRecorded {
	readonly page: AppPage;
	readonly reason: string;
}

export interface TitledTab {
	readonly id: string;
	readonly app: string;
	readonly title: string | null;
	readonly favicon: string | null;
}

const APP_FILES = "sumi-app://";
const FOREIGN_FAVICON = "a favicon not served by {app} itself is refused";

export function pageRecordedOf(was: AppPage, recorded: RecordedPage): PageRecorded {
	const page = {
		...was,
		title: recorded.title ?? was.title,
		favicon: recorded.favicon ?? was.favicon,
		actions: recorded.actions ?? was.actions,
	};
	return {
		page,
		reason: `tab ${recorded.id} title ${titleSaid(was)} → ${titleSaid(page)}, actions ${idsOf(was.actions)} → ${idsOf(page.actions)} (the page reported it)`,
	};
}

export function pageRememberedOf(was: AppPage, remembered: RememberedPageTitle): PageRecorded | null {
	const page = rememberedPageOf(was, remembered);

	if (page === null) {
		return null;
	}

	return {
		page,
		reason: `tab ${remembered.tabId} title ${titleSaid(was)} → ${titleSaid(page)} (the browser's page)`,
	};
}

export function pageTitleOf(tab: TitledTab, faces: readonly AppFace[]): PageTitle {
	const face = faces.find((each) => each.id === tab.app);
	return {
		id: tab.id,
		title: tab.title,
		favicon: tab.favicon ?? face?.iconUrl ?? null,
		appTitle: face?.title ?? null,
	};
}

function titleSaid(page: AppPage): string {
	return page.title ?? "none";
}

export function refuseForeignFavicon(app: string, favicon: string | undefined): string | null {
	if (favicon === undefined || !favicon.startsWith(APP_FILES) || favicon.startsWith(`${APP_FILES}${app}/`)) {
		return null;
	}

	return FOREIGN_FAVICON.replace("{app}", app);
}

function idsOf(actions: readonly { readonly id: string }[]): string {
	return actions.map(({ id }) => id).join(",") || "none";
}

const UNREMEMBERED_ADDRESSES: ReadonlySet<string> = new Set(["", "about:blank"]);

function rememberedPageOf(was: AppPage, remembered: RememberedPageTitle): AppPage | null {
	if (UNREMEMBERED_ADDRESSES.has(remembered.url)) {
		return null;
	}

	const next = {
		...was,
		title: remembered.title === "" ? was.title : remembered.title,
		favicon: remembered.favicon ?? was.favicon,
	};
	return next.title === was.title && next.favicon === was.favicon ? null : next;
}
