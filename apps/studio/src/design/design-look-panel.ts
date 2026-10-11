import { createElement as h } from "react";
import type { ReactElement } from "react";
import { NativeSelect, NativeSelectOption, Segmented } from "@widgetarium/kit";
import type { Look, LookSetting } from "@widgetarium/core/app-look.js";
import type { Parsed } from "@widgetarium/core/json-text.js";
import { fontsUrlOf, isSettingDrawnLive, liveRulesOf, liveTokensOf } from "./look-tokens.js";

export type LookPick = (settingName: string, option: string) => void;

const TITLE = "Look";
const SUGGESTED_HINT = "Suggested: {option}";
const REDRAWN_HINT = "The assistant draws this into the next screens";
const UNREADABLE = "The look cannot be read: {why}";
const SEGMENTS_AT_MOST = 3;
const DRAWN_SCREENS = ".wg-design-screen, .wg-design-screen :is(.wg-root, .wg-portal)";
// TRADE-OFF: values the kit derives on its root are inherited already computed, so they are derived again here.
const DERIVED_AGAIN =
	"font-family: var(--font-interface); --radius: var(--wg-kit-plate); --wg-kit-item: calc(var(--wg-kit-plate) - var(--wg-kit-plate-pad));";

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

function LiveLookTokens({ look }: { readonly look: Look }): ReactElement {
	const live = liveTokensOf(look);
	const tokens = Object.entries(live)
		.map(([name, value]) => `${name}: ${value};`)
		.join(" ");
	const ground = "--wg-kit-page" in live ? ".wg-design-screen { background: var(--wg-kit-page); }" : "";
	const fontsUrl = fontsUrlOf(look);
	return h("div", { hidden: true }, [
		h("style", { key: "tokens" }, `${DRAWN_SCREENS} { ${tokens} ${DERIVED_AGAIN} } ${ground} ${liveRulesOf(look)}`),
		fontsUrl ? h("link", { key: "fonts", rel: "stylesheet", href: fontsUrl }) : null,
	]);
}

function LookRow({ setting, onPick }: { readonly setting: LookSetting; readonly onPick: LookPick }): ReactElement {
	const isSuggestionLeft = setting.picked !== setting.recommended;
	return h("div", { className: "wg-design-look-row" }, [
		h("span", { key: "label", className: "wg-design-look-label" }, setting.ask ?? setting.name),
		h(LookChoice, { key: "choice", setting, onPick }),
		isSuggestionLeft
			? h(
					"span",
					{ key: "suggested", className: "wg-design-look-said" },
					SUGGESTED_HINT.replace("{option}", setting.recommended),
				)
			: null,
		isSettingDrawnLive(setting.name)
			? null
			: h("span", { key: "redrawn", className: "wg-design-look-said" }, REDRAWN_HINT),
	]);
}

function LookChoice({ setting, onPick }: { readonly setting: LookSetting; readonly onPick: LookPick }): ReactElement {
	const pick = (option: string): void => onPick(setting.name, option);
	if (setting.options.length <= SEGMENTS_AT_MOST)
		return h(Segmented<string>, {
			size: "s",
			items: setting.options.map((option) => ({ value: option, label: option })),
			value: setting.picked,
			onValueChange: pick,
		});
	return h(
		NativeSelect,
		{ value: setting.picked, onValueChange: pick, "aria-label": setting.ask ?? setting.name },
		setting.options.map((option) => h(NativeSelectOption, { key: option, value: option }, option)),
	);
}
