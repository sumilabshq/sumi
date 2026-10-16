import type { Look } from "../../../shared/schema/look.schema.js";
import { liveRulesOf, liveTokensOf } from "./look-tokens.js";

const DRAWN_SCREENS = "[data-canvas-screen], [data-canvas-screen] :is(.wg-root, .wg-portal)";
// TRADE-OFF: values the kit derives on its root are inherited already computed, so they are derived again here.
const DERIVED_AGAIN =
	"font-family: var(--font-interface); --radius: var(--wg-kit-plate); --wg-kit-item: calc(var(--wg-kit-plate) - var(--wg-kit-plate-pad));";

export function lookSheetOf(look: Look): string {
	const live = liveTokensOf(look);
	const tokens = Object.entries(live)
		.map(([name, value]) => `${name}: ${value};`)
		.join(" ");
	const ground = "--wg-kit-page" in live ? "[data-canvas-screen] { background: var(--wg-kit-page); }" : "";
	return `${DRAWN_SCREENS} { ${tokens} ${DERIVED_AGAIN} } ${ground} ${liveRulesOf(look)}`;
}
