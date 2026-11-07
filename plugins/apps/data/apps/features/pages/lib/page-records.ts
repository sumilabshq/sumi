import type { AppPage, RememberedPageTitle } from "../../../shared/schema/page.schema.js";

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

const APP_FILES = "sumi-app://";
const FOREIGN_FAVICON = "a favicon not served by {app} itself is refused";

export function pageRecordedOf(was: AppPage, { id, title, favicon, actions }: RecordedPage): PageRecorded {
	const page = {
		...was,
		title: title ?? was.title,
		favicon: favicon ?? was.favicon,
		actions: actions ?? was.actions,
	};
	return {
		page,
		reason: `tab ${id} title ${was.title ?? "none"} → ${page.title ?? "none"}, actions ${idsOf(was.actions)} → ${idsOf(page.actions)} (the page reported it)`,
	};
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

export function rememberedPageOf(was: AppPage, { url, title, favicon }: RememberedPageTitle): AppPage | null {
	if (UNREMEMBERED_ADDRESSES.has(url)) {
		return null;
	}

	const next = {
		...was,
		title: title === "" ? was.title : title,
		favicon: favicon ?? was.favicon,
	};
	return next.title === was.title && next.favicon === was.favicon ? null : next;
}
