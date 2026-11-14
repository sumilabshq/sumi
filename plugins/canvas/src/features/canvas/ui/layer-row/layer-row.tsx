import { createElement as h, Fragment, useState } from "react";
import type { ReactElement } from "react";
import { Icon, SidePanelRow } from "@widgetarium/kit";
import type { Layer, LayerKind } from "../../../../shared/lib/layers-of.js";

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
			<SidePanelRow
				icon={<Icon name={KIND_ICONS[layer.kind]} size={16} />}
				label={layer.name}
				end={hasChildren ? <Icon name={isOpen ? "chevron-down" : "chevron-right"} size={16} /> : null}
				depth={depth}
				aria-expanded={hasChildren ? isOpen : undefined}
				onClick={() => setOpen(!isOpen)}
			/>
			{isOpen ? layer.children.map((child) => <LayerRow key={child.path} layer={child} depth={depth + 1} />) : null}
		</Fragment>
	);
}
