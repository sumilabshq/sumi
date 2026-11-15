import { linkTargetOf } from "@widgetarium/core/engine/sumi-link.js";
import { bareAddressOf } from "../../../shared/lib/address.js";
import type { DraftedMenu, FilledPage, PageAsk, Pools, Typed } from "../../../shared/host/command-menu.host.js";
import type { Found, RowIcon } from "../../../shared/schema/command-menu.schema.js";
import { jumpBackOf, listOf, poolOf, uncountedMenuOf } from "./draft-parts.js";
import { askAboutFound, linkWayFound, searchForFound } from "./made.js";
import { rankedOf } from "./match.js";

interface LinkFace {
	readonly title: string;
	readonly icon: RowIcon | null;
}

const MATCHED_SHOWN = 3;
const HERE_KEYS = "↵ here";
const NEW_TAB_KEYS = "⌘↵";
const NEW_WINDOW_KEYS = "⇧⌘↵";
const OPEN_IN_NEW_TAB = "Open in a new tab";
const OPEN_IN_NEW_WINDOW = "Open in a new window";

export const HOME_PAGE: FilledPage = {
	id: "home",
	draftsOf: homeMenuOf,
};

function homeMenuOf({ pools, typed }: PageAsk): DraftedMenu {
	if (typed.lower === "") {
		return uncountedMenuOf([listOf("Open", poolOf(pools, "apps")), listOf("Recent", jumpBackOf(pools))]);
	}

	if (typed.isSumiLink || typed.isAddress) {
		return uncountedMenuOf([listOf("Link", linkWaysOf(pools, typed))]);
	}

	return uncountedMenuOf([
		listOf("Apps", matchedOf(pools, "apps", typed)),
		listOf("Tabs", matchedOf(pools, "tabs", typed)),
		listOf("Chats", matchedOf(pools, "chats", typed)),
		listOf("Or", [askAboutFound(typed.text), searchForFound(typed.text, "this-tab")]),
	]);
}

function matchedOf(pools: Pools, source: string, typed: Typed): readonly Found[] {
	return rankedOf(poolOf(pools, source), typed.matched).slice(0, MATCHED_SHOWN);
}

function linkWaysOf(pools: Pools, typed: Typed): readonly Found[] {
	const face = linkFaceOf(pools, typed);
	const here = linkWayFound({
		typed,
		where: "this-tab",
		title: face.title,
		shortcut: HERE_KEYS,
	});
	return [
		face.icon === null
			? here
			: {
					...here,
					icon: face.icon,
				},
		linkWayFound({
			typed,
			where: "new-tab",
			title: OPEN_IN_NEW_TAB,
			shortcut: NEW_TAB_KEYS,
		}),
		linkWayFound({
			typed,
			where: "new-window",
			title: OPEN_IN_NEW_WINDOW,
			shortcut: NEW_WINDOW_KEYS,
		}),
	];
}

function linkFaceOf(pools: Pools, typed: Typed): LinkFace {
	if (!typed.isSumiLink) {
		return faceOf(bareAddressOf(typed.text), null);
	}

	const read = linkTargetOf(typed.text);

	if (!read.ok) {
		return faceOf(typed.text, null);
	}

	const { target } = read;

	if (target.kind === "page") {
		const app = poolOf(pools, "apps").find(({ intent }) => intent.do === "open-app" && intent.app === target.app);
		const name = app?.title ?? target.app;
		return faceOf(target.address === "" ? name : `${name}: ${target.address}`, app?.icon ?? null);
	}

	const found = poolOf(pools, `${target.kind}s`).find(({ key }) => key === `${target.kind}:${target.id}`);
	return faceOf(found?.title ?? typed.text, found?.icon ?? null);
}

function faceOf(title: string, icon: RowIcon | null): LinkFace {
	return {
		title,
		icon,
	};
}
