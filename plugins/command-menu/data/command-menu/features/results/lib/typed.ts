import { isSumiLink } from "@widgetarium/core/engine/sumi-link.js";
import { hostOf, isAddressLike } from "../../../shared/lib/address.js";
import type { Door, Intent } from "../../../shared/schema/command-menu.schema.js";
import type { Typed } from "../../../shared/host/command-menu.host.js";

export function typedOf(text: string): Typed {
	const said = text.trim();
	const isAddress = isAddressLike(said);
	const host = isAddress ? hostOf(said) : "";
	return {
		text: said,
		lower: said.toLowerCase(),
		isAddress,
		isSumiLink: isSumiLink(said),
		host,
		matched: isAddress ? (host.replace(/^www\./, "").split(".")[0] ?? "") : said.toLowerCase(),
	};
}

export function fallbackIntentOf(typed: Typed, door: Door): Intent | null {
	if (door === "ask") {
		return {
			do: "ask-ink",
			text: typed.text,
			sends: false,
		};
	}

	if (typed.text === "") {
		return {
			do: "run",
			command: "new-tab",
		};
	}

	return newTabIntentOf(typed);
}

export function fallbackLabelOf(typed: Typed, door: Door): string {
	if (door === "ask") {
		return "Create only";
	}

	if (typed.text === "") {
		return "New tab";
	}

	return typed.isAddress || typed.isSumiLink ? "Open in a new tab" : "Search the web";
}

export function askInkOf(typed: Typed): Intent | null {
	return {
		do: "ask-ink",
		text: typed.text,
		sends: typed.text !== "",
	};
}

function newTabIntentOf(typed: Typed): Intent {
	return typed.isSumiLink
		? {
				do: "open-link",
				href: typed.text,
				where: "new-tab",
			}
		: {
				do: "open-address",
				address: typed.text,
				where: "new-tab",
			};
}
