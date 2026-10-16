import { createElement as h } from "react";
import type { MouseEvent, PointerEvent, ReactElement } from "react";
import { Collapsible } from "radix-ui";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import { treeRowProps } from "@widgetarium/behaviors";
import type { LayerKind, TreeDrag } from "@widgetarium/behaviors";
import { PickLayerCommand } from "../../contract.js";
import { ToggleLayerFoldCommand } from "../../contract.js";
import type { LayerRow as Row } from "../../../../shared/schema/layer-row.schema.js";
import { LayerName } from "./layer-name.js";
import {
	PANEL_ROW,
	PANEL_ROW_INDENT_PX,
	PANEL_ROW_INSET_PX,
	PANEL_ROW_OPENER,
} from "../../../../shared/lib/side-panel/panel-row-look.js";

export interface LayerRowProps {
	readonly row: Row;
	readonly drag: TreeDrag;
	readonly onHover: (depth: number) => void;
}

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

const LAYER_ROW = `${PANEL_ROW} cv:data-[kind=widget]:cursor-grab cv:data-[kind=widget]:text-brand cv:group-data-[dragging]/tree:transition-transform cv:data-[lifted]:relative cv:data-[lifted]:z-[2] cv:data-[lifted]:bg-raise cv:data-[lifted]:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge),0_8px_20px_-8px_var(--wg-overlay-scrim)] cv:data-[lifted]:transition-none`;

export function LayerRow({ row, drag, onHover }: LayerRowProps): ReactElement {
	const pick = useCommand(PickLayerCommand);
	const fold = useCommand(ToggleLayerFoldCommand);
	const hasChildren = row.children.length > 0;
	return (
		<Collapsible.Root open={row.isOpen} onOpenChange={() => void fold.run({ id: row.id })}>
			<div
				className={LAYER_ROW}
				style={{ paddingLeft: row.depth * PANEL_ROW_INDENT_PX + PANEL_ROW_INSET_PX }}
				{...treeRowProps(row)}
				data-kind={row.kind}
				data-picked={row.isPicked ? "" : undefined}
				onMouseEnter={() => onHover(row.depth)}
				onPointerDown={(event: PointerEvent) => drag.onPointerDown(event, row.id, row.canDrag)}
				onClick={() => {
					if (!drag.wasDragged()) void pick.run({ id: row.id });
				}}
			>
				{hasChildren ? (
					<Collapsible.Trigger
						className={`${PANEL_ROW_OPENER} cv:cursor-pointer cv:hover:bg-raise cv:hover:text-ink cv:hover:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge)]`}
						onPointerDown={(event: PointerEvent) => event.stopPropagation()}
						onClick={(event: MouseEvent) => event.stopPropagation()}
					>
						<Icon
							name="chevron-down"
							size={12}
							className={`cv:transition-[rotate] cv:duration-200 cv:ease-spring ${row.isOpen ? "" : "cv:-rotate-90"}`}
						/>
					</Collapsible.Trigger>
				) : (
					<span className={PANEL_ROW_OPENER} />
				)}
				<Icon name={KIND_ICON[row.kind]} size={14} />
				<LayerName title={row.title} isHeld={row.isHeld} />
				{row.repeats > 1 ? <span className="cv:text-sm cv:text-muted-foreground">{`×${row.repeats}`}</span> : null}
			</div>
			{hasChildren ? (
				<Collapsible.Content className="cv:w-max cv:min-w-full cv:overflow-hidden cv:group-data-[dragging]/tree:overflow-visible cv:data-[state=open]:animate-canvas-fold-open cv:data-[state=closed]:animate-canvas-fold-shut">
					{row.children.map((child) => (
						<LayerRow key={child.id} row={child} drag={drag} onHover={onHover} />
					))}
				</Collapsible.Content>
			) : null}
		</Collapsible.Root>
	);
}
