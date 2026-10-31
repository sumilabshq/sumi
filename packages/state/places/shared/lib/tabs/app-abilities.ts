import type { AppKind, BuiltInApp } from "../../schema/tabs.schema.js";

export interface AppAbilities {
	readonly holdsTabs: boolean;
	readonly navigates: boolean;
	readonly splits: boolean;
	readonly runsInPage: boolean;
	readonly keepsRecord: boolean;
}

const PAGE_APP: AppAbilities = {
	holdsTabs: false,
	navigates: false,
	splits: false,
	runsInPage: true,
	keepsRecord: false,
};

const ABILITIES_OF_APP: Readonly<Record<BuiltInApp, AppAbilities>> = {
	browser: {
		...PAGE_APP,
		navigates: true,
	},
	canvas: PAGE_APP,
	terminal: PAGE_APP,
	tasks: PAGE_APP,
	chat: {
		holdsTabs: true,
		navigates: false,
		splits: true,
		runsInPage: false,
		keepsRecord: true,
	},
};

export function abilitiesOf(app: AppKind): AppAbilities {
	return isBuiltInApp(app) ? ABILITIES_OF_APP[app] : PAGE_APP;
}

export function isBuiltInApp(app: AppKind): app is BuiltInApp {
	return Object.hasOwn(ABILITIES_OF_APP, app);
}

export function holdsTabs({ app }: { readonly app: AppKind }): boolean {
	return abilitiesOf(app).holdsTabs;
}

export function holderIdsOf(tabs: readonly { readonly id: string; readonly app: AppKind }[]): ReadonlySet<string> {
	return new Set(tabs.filter(holdsTabs).map((tab) => tab.id));
}

export function isPageApp(app: AppKind): boolean {
	return abilitiesOf(app).runsInPage;
}
