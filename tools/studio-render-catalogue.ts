import { NOT_AVAILABLE_ON_HOST } from "../packages/core/src/engine/studio-host.ts";
import { PLATE_LEAST_PX } from "../packages/layout/shared/lib/frame-bounds.ts";
import { studioSplitOf } from "./studio-sheet.mts";

type Width = { readonly w: number; readonly right: number };

type Check = (what: string, isOk: boolean, got: unknown) => void;

interface ImportsOf {
	readonly imports: readonly { readonly path: string }[];
}

export interface CatalogueSeen {
	readonly catalogueElements?: number;
	readonly appCatalogue?: Width | null;
	readonly chatCatalogue?: Width | null;
	readonly sidebarCatalogue?: Width | null;
	readonly frameOverflow?: number | null;
	readonly listed?: readonly string[];
	readonly installSaid?: string | null;
	readonly closeAnswered?: string | null;
	readonly chatBesideCatalogue?: boolean;
	readonly catalogueShut?: boolean;
	readonly askOpened?: boolean;
	readonly picked?: string | null;
	readonly catalogueClosed?: boolean;
}

const CATALOGUE_PACK = "@widgetarium/pack-catalogue";
const CATALOGUE_CLASS = ".wg-studio-catalogue-";
const PROJECT_WIDGET = { id: "task-list", title: "Task list" };

export function catalogueImportsIn(inputs: Readonly<Record<string, ImportsOf>>): string[] {
	return Object.values(inputs).flatMap((input) =>
		input.imports.filter((one) => one.path.startsWith(CATALOGUE_PACK)).map((one) => one.path),
	);
}

export function checkCatalogueAbsentInApp(seen: CatalogueSeen, check: Check): void {
	check("and no catalogue element", seen.catalogueElements === 0, seen.catalogueElements);
}

export function checkCataloguePanel(seen: CatalogueSeen, check: Check): void {
	check("a widget asked for opens the catalogue panel", seen.askOpened === true, seen.askOpened);
	check(
		"the catalogue panel stands inside the window, beside a chat and an app plate that keep their least widths",
		isBesidePlates(seen),
		{
			app: seen.appCatalogue,
			chat: seen.chatCatalogue,
			panel: seen.sidebarCatalogue,
			overflow: seen.frameOverflow,
		},
	);
	check("it lists the project's own widgets", sameList(seen.listed, [PROJECT_WIDGET.title]), seen.listed);
	check("an install on this host answers not available", seen.installSaid === NOT_AVAILABLE_ON_HOST, seen.installSaid);
	check("the chat stays on screen beside the catalogue", seen.chatBesideCatalogue === true, seen.chatBesideCatalogue);
	check("the catalogue's close press shuts it", seen.catalogueShut === true, seen.catalogueShut);
	check("and answers the ask it was opened for with nothing", seen.closeAnswered === null, seen.closeAnswered);
	check("a card pressed answers the next ask", seen.picked === PROJECT_WIDGET.id, seen.picked);
	check("and the answered ask closes the panel", seen.catalogueClosed === true, seen.catalogueClosed);
}

export function checkCatalogueSheetSplit(sheets: string, check: Check): void {
	const { app, studio } = studioSplitOf(sheets);
	check(
		"the app sheet carries no catalogue rule, the studio sheet does",
		!app.includes(CATALOGUE_CLASS) && studio.includes(CATALOGUE_CLASS),
		{ app: app.split(CATALOGUE_CLASS).length - 1, studio: studio.split(CATALOGUE_CLASS).length - 1 },
	);
}

function isBesidePlates({ appCatalogue, chatCatalogue, sidebarCatalogue, frameOverflow }: CatalogueSeen): boolean {
	if (!appCatalogue || !chatCatalogue || !sidebarCatalogue) {
		return false;
	}

	return (
		appCatalogue.w >= PLATE_LEAST_PX &&
		chatCatalogue.w >= PLATE_LEAST_PX &&
		sidebarCatalogue.right >= 0 &&
		frameOverflow === 0
	);
}

function sameList(got: readonly string[] | undefined, wanted: readonly string[]): boolean {
	return JSON.stringify(got ?? []) === JSON.stringify(wanted);
}
