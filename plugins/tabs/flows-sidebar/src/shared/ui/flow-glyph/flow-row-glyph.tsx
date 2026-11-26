import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useTabFace } from "@sumi/sumi-host-plugin";
import type { FlowRowFacts } from "../../lib/flow-facts.js";
import { FlowGlyph } from "./flow-glyph.js";

export interface FlowRowGlyphProps {
	readonly flow: Pick<FlowRowFacts, "name" | "icon" | "face">;
}

export function FlowRowGlyph({ flow }: FlowRowGlyphProps): ReactElement {
	const TabFace = useTabFace();

	if (flow.icon !== null || flow.face === null) {
		return <FlowGlyph icon={flow.icon} fallback="dot" />;
	}

	return (
		<span className="sumi-flows-glyph" data-scale="row">
			<TabFace art={flow.face.art} favicon={null} title={flow.name} address={flow.face.address} mark="none" />
		</span>
	);
}
