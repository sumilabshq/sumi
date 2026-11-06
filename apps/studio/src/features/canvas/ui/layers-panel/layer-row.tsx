import { createElement as h } from "react";
import type { MouseEvent, PointerEvent, ReactElement } from "react";
import { Collapsible } from "radix-ui";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/framework";
import { treeRowProps } from "@widgetarium/behaviors";
import type { TreeDrag } from "@widgetarium/behaviors";
import { PickLayerCommand } from "@widgetarium/canvas";
import { ToggleLayerFoldCommand } from "@widgetarium/canvas";
import type { LayerRow as Row } from "@widgetarium/canvas";
import { LayerName } from "./layer-name.js";
import { LAYER_ROW_BASE, PANEL_ROW_INDENT_PX, PANEL_ROW_INSET_PX } from "../../lib/panel-row-look.js";

export interface LayerRowProps {
	readonly row: Row;
	readonly drag: TreeDrag;
	readonly onHover: (depth: number) => void;
}

const LAYER_ROW = `${LAYER_ROW_BASE} cv:data-[kind=widget]:cursor-grab cv:data-[kind=widget]:text-brand cv:group-data-[dragging]/tree:transition-transform cv:data-[lifted]:z-[2] cv:data-[lifted]:bg-group cv:data-[lifted]:shadow-[0_8px_20px_-8px_var(--wg-overlay-scrim)] cv:data-[lifted]:transition-none`;
const OPENER =
	"cv:absolute cv:top-1/2 cv:grid cv:size-3 cv:-translate-y-1/2 cv:cursor-pointer cv:place-items-center cv:border-0 cv:bg-transparent cv:p-0 cv:text-muted-foreground cv:opacity-0 cv:shadow-none cv:transition-opacity cv:group-hover/row:opacity-100 cv:hover:text-ink cv:focus-visible:opacity-100 cv:data-[state=closed]:opacity-100";

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
						className={OPENER}
						style={{ left: row.depth * PANEL_ROW_INDENT_PX }}
						onPointerDown={(event: PointerEvent) => event.stopPropagation()}
						onClick={(event: MouseEvent) => event.stopPropagation()}
					>
						<Icon
							name="chevron-down"
							size={12}
							className={`cv:transition-[rotate] cv:duration-200 cv:ease-spring ${row.isOpen ? "" : "cv:-rotate-90"}`}
						/>
					</Collapsible.Trigger>
				) : null}
				<LayerName title={row.title} isHeld={row.isHeld} />
				{row.repeats > 1 ? <span className="cv:text-sm cv:text-muted-foreground">{`×${row.repeats}`}</span> : null}
			</div>
			{hasChildren ? (
				<Collapsible.Content className="cv:w-full cv:overflow-hidden cv:group-data-[dragging]/tree:overflow-visible cv:data-[state=open]:animate-canvas-fold-open cv:data-[state=closed]:animate-canvas-fold-shut">
					{row.children.map((child) => (
						<LayerRow key={child.id} row={child} drag={drag} onHover={onHover} />
					))}
				</Collapsible.Content>
			) : null}
		</Collapsible.Root>
	);
}
