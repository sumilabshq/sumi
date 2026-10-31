import { hostOf, isAddressLike } from "../../../shared/lib/address.js";
import type { Door, Intent } from "../../../shared/schema/command-menu.schema.js";
import type { Typed } from "./drafts.js";

export function typedOf(text: string): Typed {
	const said = text.trim();
	const isAddress = isAddressLike(said);
	const host = isAddress ? hostOf(said) : "";
	return {
		text: said,
		lower: said.toLowerCase(),
		isAddress,
		host,
		matched: isAddress ? (host.replace(/^www\./, "").split(".")[0] ?? "") : said.toLowerCase(),
	};
}

export function fallbackIntentOf(typed: Typed, door: Door): Intent | null {
	if (typed.text !== "" && door === "ask") {
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

	return {
		do: "open-address",
		address: typed.text,
		where: "new-tab",
	};
}

export function fallbackLabelOf(typed: Typed, door: Door): string {
	if (typed.text !== "" && door === "ask") {
		return "Create only";
	}

	if (typed.text === "") {
		return "New tab";
	}

	return typed.isAddress ? "Open in a new tab" : "Search the web";
}

export function askInkOf(typed: Typed): Intent | null {
	if (typed.text === "") {
		return {
			do: "run",
			command: "new-chat",
		};
	}

	return {
		do: "ask-ink",
		text: typed.text,
		sends: true,
	};
}
