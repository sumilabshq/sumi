import { createElement as h, useEffect, useState } from "react";
import type { MouseEvent, PointerEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { LayerDrag } from "./hooks/use-layer-drag.js";
import { canHoldChildren } from "./lib/can-hold.js";
import type { Layer, LayerKind } from "../layers/layer-tree.js";
import { Tip } from "../tip/tip.js";
import { Fold } from "./fold.js";

export interface LayerRowProps {
	readonly layer: Layer;
	readonly depth: number;
	readonly isLocked: boolean;
	readonly picked: string | null;
	readonly opened: ReadonlySet<string>;
	readonly drag: LayerDrag;
	readonly onPick: (mark: string) => void;
	readonly onHover: (depth: number) => void;
}

export const INDENT_PX = 14;
const HELD_SAID = "Handed to a component as a prop, so it stays where it is";
const KIND_ICON: Readonly<Record<LayerKind, string>> = {
	widget: "puzzle",
	row: "columns-3",
	column: "rows-3",
	grid: "grid-2x2",
	group: "square",
	input: "text-cursor-input",
	button: "mouse-pointer-click",
	text: "type",
	picture: "image",
};
const ROW =
	"cv:flex cv:h-[26px] cv:w-max cv:min-w-full cv:cursor-pointer cv:items-center cv:gap-1.5 cv:whitespace-nowrap cv:rounded-md cv:pr-2 cv:text-base cv:text-ink cv:transition-[background-color,box-shadow] cv:hover:bg-raise cv:hover:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge)] cv:data-[picked]:bg-raise cv:data-[picked]:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge)] cv:data-[kind=widget]:cursor-grab cv:data-[kind=widget]:text-brand cv:group-data-[dragging]/tree:transition-transform cv:data-[lifted]:relative cv:data-[lifted]:z-[2] cv:data-[lifted]:bg-raise cv:data-[lifted]:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge),0_8px_20px_-8px_var(--wg-overlay-scrim)] cv:data-[lifted]:transition-none";
const OPENER =
	"cv:grid cv:size-[18px] cv:flex-none cv:place-items-center cv:rounded-[5px] cv:border-0 cv:bg-transparent cv:p-0 cv:text-muted-foreground cv:shadow-none cv:transition-[background-color,box-shadow]";

export function LayerRow(props: LayerRowProps): ReactElement {
	const { layer, depth, isLocked, picked, opened, drag, onPick, onHover } = props;
	const [isOpen, setOpen] = useState(true);
	const holdsPicked = opened.has(layer.mark);
	useEffect(() => {
		if (holdsPicked) setOpen(true);
	}, [holdsPicked]);
	const isDraggable = !layer.isHeld && (layer.kind === "widget" || !isLocked);
	const hasChildren = layer.children.length > 0;
	return (
		<div>
			<div
				className={ROW}
				style={{ paddingLeft: depth * INDENT_PX + 6 }}
				data-canvas-layer-row=""
				data-kind={layer.kind}
				data-picked={picked === layer.mark ? "" : undefined}
				data-mark={layer.mark}
				data-depth={depth}
				data-can-hold={canHoldChildren(layer)}
				data-held={layer.isHeld}
				data-scope={layer.scope}
				onMouseEnter={() => onHover(depth)}
				onPointerDown={(event: PointerEvent) => drag.onPointerDown(event, layer.mark, isDraggable)}
				onClick={() => {
					if (!drag.wasDragged()) onPick(layer.mark);
				}}
			>
				{hasChildren ? (
					<button
						type="button"
						className={`${OPENER} cv:cursor-pointer cv:hover:bg-raise cv:hover:text-ink cv:hover:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge)]`}
						aria-expanded={isOpen}
						onPointerDown={(event: PointerEvent) => event.stopPropagation()}
						onClick={(event: MouseEvent) => {
							event.stopPropagation();
							setOpen(!isOpen);
						}}
					>
						<Icon
							name="chevron-down"
							size={12}
							className={`cv:transition-[rotate] cv:duration-200 cv:ease-spring ${isOpen ? "" : "cv:-rotate-90"}`}
						/>
					</button>
				) : (
					<span className={OPENER} />
				)}
				<Icon name={KIND_ICON[layer.kind]} size={14} />
				{nameOf(layer)}
				{layer.repeats > 1 ? <span className="cv:text-sm cv:text-muted-foreground">{`×${layer.repeats}`}</span> : null}
			</div>
			{hasChildren ? (
				<Fold isOpen={isOpen}>
					{layer.children.map((child) => (
						<LayerRow {...props} key={child.mark} layer={child} depth={depth + 1} />
					))}
				</Fold>
			) : null}
		</div>
	);
}

function nameOf(layer: Layer): ReactElement {
	const name = <span className="cv:overflow-hidden cv:text-ellipsis">{layer.name}</span>;
	return layer.isHeld ? <Tip label={HELD_SAID}>{name}</Tip> : name;
}
