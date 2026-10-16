import { COMPONENTS_PAGE, DOCS_PAGE, PAGES, REFERENCES_PAGE } from "../../schema/canvas-page.schema.js";
import type { DrawnDesign, DrawnReference } from "../../schema/design.schema.js";
import type { Job } from "../../schema/job.schema.js";
import type { Variants } from "../../schema/canvas-view.schema.js";
import { pageOfScreen, screensOfPage, shownVariantOf, variantLetterOf } from "./screen-names.js";

export interface CanvasPages {
	readonly leading: readonly string[];
	readonly screens: readonly string[];
	readonly trailing: readonly string[];
	readonly shown: string;
	readonly running: Readonly<Record<string, string>>;
	readonly shownScreens: readonly string[];
	readonly shownScreen: string | null;
	readonly shownReferences: readonly DrawnReference[];
	readonly shownJob: Job | null;
	readonly variants: readonly { readonly screen: string; readonly letter: string | null }[];
}

export interface CanvasHeld {
	readonly design: DrawnDesign;
	readonly jobs: readonly Job[];
	readonly hasDocs: boolean;
	readonly keptPage: string;
	readonly variants: Variants;
}

const TABS_RENAMED: Readonly<Record<string, string>> = {
	Brief: DOCS_PAGE,
	"Design system": DOCS_PAGE,
	Widgets: COMPONENTS_PAGE,
};

const TAB_PAGES: ReadonlySet<string> = new Set([DOCS_PAGE, REFERENCES_PAGE, COMPONENTS_PAGE]);

export function canvasPagesOf(asked: string, held: CanvasHeld): CanvasPages {
	const tabs = canvasTabsOf(held);
	const all = [...tabs.leading, ...tabs.screens, ...tabs.trailing];
	const shown = shownPageOf(asked, all);
	const ofPage = screensOfPage(held.design.screens, shown);
	const running = runningJobsOf(held.jobs);
	const shownScreens = shownVariantOf(ofPage, held.variants[shown]).map((screen) => screen.name);
	return {
		...tabs,
		shown,
		running,
		shownScreens,
		shownScreen: shownScreens[0] ?? null,
		shownReferences: held.design.references.filter(
			(reference) => reference.pages.length === 0 || reference.pages.includes(shown),
		),
		shownJob: held.jobs.find((job) => job.id === running[shown]) ?? null,
		variants: ofPage.length < 2 ? [] : ofPage.map(({ name }) => ({ screen: name, letter: variantLetterOf(name) })),
	};
}

function canvasTabsOf({
	design,
	jobs,
	hasDocs,
	keptPage,
}: CanvasHeld): Pick<CanvasPages, "leading" | "screens" | "trailing"> {
	const drawn = [...new Set(design.screens.map((screen) => pageOfScreen(screen.name)))];
	const coming = Object.keys(runningJobsOf(jobs)).filter((page) => !drawn.includes(page));
	const listed = [...drawn, ...coming];
	// TRADE-OFF: a page the agent deletes stays an empty tab until the person leaves it; moving them would be worse.
	const isKept = keptPage !== "" && !listed.includes(keptPage) && !TAB_PAGES.has(keptPage);
	return {
		leading: hasDocs ? [DOCS_PAGE] : [],
		screens: isKept ? [...listed, keptPage] : listed.length > 0 ? listed : [PAGES],
		trailing: [...(design.references.length > 0 ? [REFERENCES_PAGE] : []), COMPONENTS_PAGE],
	};
}

function shownPageOf(asked: string, pages: readonly string[]): string {
	if (pages.includes(asked)) return asked;
	const renamed = TABS_RENAMED[asked];
	if (renamed !== undefined && pages.includes(renamed)) return renamed;
	return pages.find((one) => one !== DOCS_PAGE) ?? COMPONENTS_PAGE;
}

function runningJobsOf(jobs: readonly Job[]): Record<string, string> {
	const running = jobs.flatMap((job) => (job.page && job.status === "running" ? [[job.page, job.id] as const] : []));
	return Object.fromEntries(running);
}
