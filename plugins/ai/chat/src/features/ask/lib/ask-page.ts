import type { Draft, DraftedMenu, Found, PageAsk } from "@sumi/command-menu-plugin";
import { createAndSendFound, createEmptyFound, createOnlyFound } from "./ask-rows.js";

export function askPageOf({ typed }: PageAsk): DraftedMenu {
	if (typed.text === "") {
		return {
			foundCount: null,
			drafts: [draftOf([createEmptyFound()], false)],
		};
	}

	return {
		foundCount: null,
		drafts: [draftOf([createAndSendFound(typed.text)], false), draftOf([createOnlyFound(typed.text)], true)],
	};
}

function draftOf(rows: readonly Found[], isFallback: boolean): Draft {
	return {
		label: "",
		layout: "list",
		rows,
		isFallback,
	};
}
