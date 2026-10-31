import { BuiltInAppSchema } from "../../schema/tabs.schema.js";
import type { AppKind, BuiltInApp } from "../../schema/tabs.schema.js";
import { isBuiltInApp } from "../tabs/app-abilities.js";
import type { AppFace, TabArt } from "../../schema/tab-rows.schema.js";
import type { HostTab } from "../tabs/host-tabs-moment.js";

export interface Named {
	readonly app: AppKind;
	readonly label: string | null;
	readonly title: string | null;
	readonly address: string | null;
}

const APP_TITLES: Readonly<Record<BuiltInApp, string>> = {
	canvas: "Canvas",
	browser: "Browser",
	terminal: "Terminal",
	tasks: "Tasks",
	chat: "New chat",
};
const EMPTY_PAGE_TITLE = "New tab";
const INSTALLED_APP_ART: TabArt = "built-app";
const ART_OF_EXTENSION: Readonly<Record<string, TabArt>> = {
	md: "note",
	txt: "note",
	csv: "table",
	ts: "code-ts",
	tsx: "code-ts",
	js: "code-js",
	jsx: "code-js",
	mjs: "code-js",
	py: "code-py",
	css: "code-css",
	png: "image",
	jpg: "image",
	jpeg: "image",
	gif: "image",
	webp: "image",
	svg: "image",
};
const ART_OF_APP: Readonly<Record<Exclude<BuiltInApp, "browser">, TabArt>> = {
	canvas: "canvas",
	terminal: "terminal",
	tasks: "tasks",
	chat: "chat",
};

export function titleOf({ app, label, title, address }: Named): string {
	return label ?? title ?? siteOf(address) ?? emptyTitleOf(app);
}

export function titleOfTab(tab: HostTab): string {
	return titleOf({
		app: tab.app,
		label: tab.label,
		title: tab.title,
		address: null,
	});
}

export function appFacesOf(): readonly AppFace[] {
	return BuiltInAppSchema.options.map((app) => ({
		app,
		title: APP_TITLES[app],
		icon: tabArtOf(app, null),
		isBuiltIn: true,
	}));
}

export function tabArtOf(app: AppKind, address: string | null): TabArt {
	if (!isBuiltInApp(app)) {
		return INSTALLED_APP_ART;
	}

	if (app !== "browser") {
		return ART_OF_APP[app];
	}

	if (address === null || address === "") {
		return "browser";
	}

	return ART_OF_EXTENSION[extensionOf(address)] ?? "site";
}

export function hostOf(url: string): string | null {
	try {
		return new URL(url).host || null;
	} catch {
		return null;
	}
}

function siteOf(address: string | null): string | null {
	return address === null ? null : hostOf(address);
}

function emptyTitleOf(app: AppKind): string {
	if (!isBuiltInApp(app)) {
		return app;
	}

	return app === "browser" ? EMPTY_PAGE_TITLE : APP_TITLES[app];
}

function extensionOf(address: string): string {
	try {
		const { pathname } = new URL(address);
		const last = pathname.split("/").at(-1) ?? "";
		return last.includes(".") ? (last.split(".").at(-1) ?? "").toLowerCase() : "";
	} catch {
		return "";
	}
}
