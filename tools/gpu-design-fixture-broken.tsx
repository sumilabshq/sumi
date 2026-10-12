import { defineLayout, defineMetadata, defineStates } from "../packages/core/src/gateway/declared.js";
import { createWidget } from "../packages/core/src/widget-api.js";

export const BROKEN_SAID = "the fixture widget breaks on purpose";

const Broken = createWidget({
	draw: () => {
		throw new Error(BROKEN_SAID);
	},
});

export const metadata = defineMetadata(Broken, {
	title: "Broken",
	description: "Does a failing widget leave the canvas standing?",
	keywords: ["broken"],
	props: {},
});

export const layout = defineLayout({ role: "collection", size: { preferredWidth: 320, preferredHeight: "auto" } });

export const states = defineStates(Broken, { Broken: {} });

export default Broken;
