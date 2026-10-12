import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Look } from "../../schemas/look.schema.js";
import { fontsUrlOf, liveRulesOf, liveTokensOf } from "./lib/look-tokens.js";

const DRAWN_SCREENS = "[data-canvas-screen], [data-canvas-screen] :is(.wg-root, .wg-portal)";
// TRADE-OFF: values the kit derives on its root are inherited already computed, so they are derived again here.
const DERIVED_AGAIN =
	"font-family: var(--font-interface); --radius: var(--wg-kit-plate); --wg-kit-item: calc(var(--wg-kit-plate) - var(--wg-kit-plate-pad));";

export function LiveLookTokens({ look }: { readonly look: Look }): ReactElement {
	const live = liveTokensOf(look);
	const tokens = Object.entries(live)
		.map(([name, value]) => `${name}: ${value};`)
		.join(" ");
	const ground = "--wg-kit-page" in live ? "[data-canvas-screen] { background: var(--wg-kit-page); }" : "";
	const fontsUrl = fontsUrlOf(look);
	return (
		<div hidden>
			<style>{`${DRAWN_SCREENS} { ${tokens} ${DERIVED_AGAIN} } ${ground} ${liveRulesOf(look)}`}</style>
			{fontsUrl ? <link rel="stylesheet" href={fontsUrl} /> : null}
		</div>
	);
}
