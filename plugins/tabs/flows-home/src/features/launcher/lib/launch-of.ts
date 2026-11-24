import type { Intent, Results, Row } from "@sumi/command-menu/contract";
import type { Launch } from "./launch-types.js";
import { slashLaunchOf } from "./slash-commands.js";

const ASK_PREFIX = "?";
const COMMAND_PREFIX = "/";

export function queryTextOf(said: string): string {
	if (said.startsWith(COMMAND_PREFIX)) {
		return "";
	}

	return said.startsWith(ASK_PREFIX) ? said.slice(ASK_PREFIX.length).trim() : said;
}

export function launchOf(said: string, results: Results | null): Launch | null {
	if (said.startsWith(COMMAND_PREFIX)) {
		return slashLaunchOf(said.slice(COMMAND_PREFIX.length));
	}

	if (results === null || said === "") {
		return null;
	}

	return said.startsWith(ASK_PREFIX) ? askLaunchOf(results) : openLaunchOf(said, results);
}

export function paneAppOf(intent: Intent): string | null {
	return intent.do === "open-app" ? intent.app : null;
}

function askLaunchOf({ askInk }: Results): Launch | null {
	return askInk === null ? null : { act: { kind: "intent", intent: askInk }, label: "Ask Sumi", tag: "AI" };
}

function openLaunchOf(said: string, results: Results): Launch | null {
	const { fallbackIntent } = results;

	if (fallbackIntent === null) {
		return null;
	}

	const fallback = { kind: "intent", intent: fallbackIntent } as const;

	if (results.isLink) {
		return { act: fallback, label: `Open ${said}`, tag: "Address" };
	}

	const app = appRowOf(results);

	if (app !== undefined) {
		return { act: { kind: "intent", intent: app.intent }, label: `Open ${app.title}`, tag: "App" };
	}

	return { act: fallback, label: results.fallbackLabel, tag: "No match" };
}

function appRowOf({ sections }: Results): Row | undefined {
	return sections.flatMap(({ rows }) => rows).find((row) => row.kind === "app" && !row.isFallback);
}
