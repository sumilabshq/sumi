import type { Look } from "../../../shared/schema/look.schema.js";
import { liveRulesOf, liveTokensOf } from "./look-tokens.js";

const DRAWN_SCREENS = "[data-canvas-screen], [data-canvas-screen] :is(.wg-root, .wg-portal)";
// TRADE-OFF: values the kit derives on its root are inherited already computed, so they are derived again here.
const DERIVED_AGAIN =
	"font-family: var(--font-interface); --radius: var(--plate-radius); --item: calc(var(--plate-radius) - var(--plate-pad));";

export function lookSheetOf(look: Look): string {
	const live = liveTokensOf(look);
	const tokens = Object.entries(live)
		.map(([name, value]) => `${name}: ${value};`)
		.join(" ");
	const ground = "--page" in live ? "[data-canvas-screen] { background: var(--page); }" : "";
	return `${DRAWN_SCREENS} { ${tokens} ${DERIVED_AGAIN} } ${ground} ${liveRulesOf(look)}`;
}
