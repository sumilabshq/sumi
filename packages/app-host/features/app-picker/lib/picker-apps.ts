import type { HostApp } from "@widgetarium/core/engine/studio-host.js";
import type { HostTab } from "../../../shared/lib/host-tabs/host-tabs.js";
import type { AppKind } from "../../../shared/schema/app-tab.schema.js";
import type { AppPicker, Permit, PickerApp } from "../contract.js";

interface BuiltInFace {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly icon: string;
	readonly permits: readonly Permit[];
	readonly isBeta: boolean;
}

interface AvailableApp extends BuiltInFace {
	readonly app: AppKind;
}

const AVAILABLE_APPS: readonly AvailableApp[] = [
	{
		id: "browser",
		app: "browser",
		name: "Browser",
		description: "Open any URL. Ink only reads the page",
		icon: "globe",
		permits: [
			{
				kind: "network",
				label: "Network",
				scope: "any site",
			},
			{
				kind: "ink",
				label: "Ink",
				scope: "read only",
			},
		],
		isBeta: false,
	},
	{
		id: "canvas",
		app: "canvas",
		name: "Canvas",
		description: "The design folder as one canvas",
		icon: "pen-tool",
		permits: [
			{
				kind: "files",
				label: "Files",
				scope: "design/",
			},
		],
		isBeta: false,
	},
];

type PlannedFace = Pick<BuiltInFace, "id" | "name" | "description" | "icon">;

const PLANNED_APPS: readonly BuiltInFace[] = [
	planned({
		id: "code",
		name: "Code",
		description: "The project's code, an IDE",
		icon: "code",
	}),
	planned({
		id: "diff",
		name: "Diff",
		description: "What changed, by file and by commit",
		icon: "diff",
	}),
	planned({
		id: "terminal",
		name: "Terminal",
		description: "Commands in the project folder",
		icon: "terminal",
	}),
	planned({
		id: "build",
		name: "Build",
		description: "Build, check and deploy runs",
		icon: "zap",
	}),
	planned({
		id: "connections",
		name: "Connections",
		description: "Environment, secrets and connections",
		icon: "plug",
	}),
	{
		...planned({
			id: "files",
			name: "Files",
			description: "Project files as a grid, like Drive",
			icon: "folder",
		}),
		isBeta: true,
	},
	planned({
		id: "ios-viewer",
		name: "iOS viewer",
		description: "Run the app in a phone simulator",
		icon: "smartphone",
	}),
];

const ONE_PAGE = "One page";
const PAGES = "{count} pages";
const MY_APP_ICON = "app-window";

export interface PickerSources {
	readonly tabs: readonly HostTab[];
	readonly hostApps: readonly HostApp[];
	readonly search: string;
}

export function appPickerOf({ tabs, hostApps, search }: PickerSources): AppPicker {
	const matchesSearch = matcherOf(search);
	return {
		mine: hostApps.map(myAppOf).filter(matchesSearch),
		builtIn: [...builtInAppsOf(tabs), ...PLANNED_APPS.map((face): PickerApp => ({ ...face, kind: "planned" }))].filter(
			matchesSearch,
		),
	};
}

function builtInAppsOf(tabs: readonly HostTab[]): readonly PickerApp[] {
	return AVAILABLE_APPS.map((available) => ({
		...available,
		kind: "built-in",
		openCount: tabs.filter((tab) => tab.app === available.app).length,
	}));
}

function myAppOf(hostApp: HostApp): PickerApp {
	return {
		kind: "mine",
		id: hostApp.id,
		name: hostApp.name,
		description: hostApp.pages === 1 ? ONE_PAGE : PAGES.replace("{count}", String(hostApp.pages)),
		icon: MY_APP_ICON,
		permits: [],
		isBeta: false,
	};
}

function matcherOf(search: string): (app: PickerApp) => boolean {
	const needle = search.trim().toLowerCase();
	return (app) => `${app.name}\n${app.description}`.toLowerCase().includes(needle);
}

function planned(face: PlannedFace): BuiltInFace {
	return {
		...face,
		permits: [],
		isBeta: false,
	};
}
