import { createElement as h } from "react";
import type { MouseEvent, PointerEvent, ReactElement } from "react";
import { Collapsible } from "radix-ui";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/mediator";
import { treeRowProps } from "@widgetarium/behaviors";
import type { TreeDrag } from "@widgetarium/behaviors";
import { PickLayerCommand } from "../../requests/pick-layer.command.js";
import { ToggleLayerFoldCommand } from "../../requests/toggle-layer-fold.command.js";
import type { LayerRow as Row } from "../../lib/layers/layer-rows.js";
import { LayerName } from "./layer-name.js";
import { KIND_ICON, OPENER, ROW } from "../../lib/layers/layer-row-look.js";

export interface LayerRowProps {
	readonly row: Row;
	readonly drag: TreeDrag;
	readonly onHover: (depth: number) => void;
}

export const INDENT_PX = 14;

export function LayerRow({ row, drag, onHover }: LayerRowProps): ReactElement {
	const pick = useCommand(PickLayerCommand);
	const fold = useCommand(ToggleLayerFoldCommand);
	const hasChildren = row.children.length > 0;
	return (
		<Collapsible.Root open={row.isOpen} onOpenChange={() => void fold.run({ id: row.id })}>
			<div
				className={ROW}
				style={{ paddingLeft: row.depth * INDENT_PX + 6 }}
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
						className={`${OPENER} cv:cursor-pointer cv:hover:bg-raise cv:hover:text-ink cv:hover:shadow-[inset_0_0_0_1px_var(--wg-kit-card-edge)]`}
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
					<span className={OPENER} />
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
