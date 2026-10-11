import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Look } from "@widgetarium/core/app-look.js";
import type { Parsed } from "@widgetarium/core/json-text.js";
import { LiveLookTokens } from "./design-live-look-tokens.js";
import { LookRow } from "./design-look-row.js";

export type LookPick = (settingName: string, option: string) => void;

const TITLE = "Look";
const UNREADABLE = "The look cannot be read: {why}";

export function LookPanel({ read, onPick }: { readonly read: Parsed<Look>; readonly onPick: LookPick }): ReactElement {
	if (read.refusal !== undefined)
		return h("aside", { className: "wg-design-look" }, [
			h("span", { key: "title", className: "wg-design-look-title" }, TITLE),
			h("span", { key: "said", className: "wg-design-look-said" }, UNREADABLE.replace("{why}", read.refusal)),
		]);
	const look = read.value;
	return h("aside", { className: "wg-design-look" }, [
		h(LiveLookTokens, { key: "tokens", look }),
		h("div", { key: "head", className: "wg-design-look-head" }, [
			h("span", { key: "title", className: "wg-design-look-title" }, TITLE),
			h("span", { key: "system", className: "wg-design-look-system" }, look.system),
		]),
		...look.settings.map((setting) => h(LookRow, { key: setting.name, setting, onPick })),
	]);
}
