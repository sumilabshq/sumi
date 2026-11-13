import { createElement as h, Fragment, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { Layer, LayerKind } from "../../../../shared/lib/layers-of.js";
import { rowIndentOf } from "../../lib/row-indent.js";

export interface LayerRowProps {
	readonly layer: Layer;
	readonly depth: number;
}

const KIND_ICONS: Readonly<Record<LayerKind, string>> = {
	frame: "square",
	group: "group",
	text: "type",
	picture: "image",
	control: "rectangle-horizontal",
	shape: "square",
};
const OPEN_UNTIL_DEPTH = 1;

export function LayerRow({ layer, depth }: LayerRowProps): ReactElement {
	const [isOpen, setOpen] = useState(depth < OPEN_UNTIL_DEPTH);
	const hasChildren = layer.children.length > 0;
	return (
		<Fragment>
			<button
				type="button"
				className="sumi-canvas-row"
				style={{ paddingLeft: rowIndentOf(depth) }}
				aria-expanded={hasChildren ? isOpen : undefined}
				onClick={() => setOpen(!isOpen)}
			>
				<Icon name={KIND_ICONS[layer.kind]} size={16} className="sumi-canvas-row-icon" />
				<span className="sumi-canvas-row-name">{layer.name}</span>
				{hasChildren ? (
					<Icon name={isOpen ? "chevron-down" : "chevron-right"} size={16} className="sumi-canvas-row-chevron" />
				) : null}
			</button>
			{isOpen ? layer.children.map((child) => <LayerRow key={child.path} layer={child} depth={depth + 1} />) : null}
		</Fragment>
	);
}
