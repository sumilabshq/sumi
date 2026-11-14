import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
	SidePanelRow,
	sidePanelIndentOf,
} from "@widgetarium/kit";
import { NameField } from "../name-field/name-field.js";

export interface NamedRowProps {
	readonly name: string;
	readonly isPicked: boolean;
	readonly depth: number;
	readonly icon: ReactNode;
	readonly end: ReactNode;
	readonly onPick: () => void;
	readonly onRename: (name: string) => void;
	readonly onDelete: () => void;
}

const RENAME = "Rename";
const DELETE = "Delete";

export function NamedRow({
	name,
	isPicked,
	depth,
	icon,
	end,
	onPick,
	onRename,
	onDelete,
}: NamedRowProps): ReactElement {
	const [isRenaming, setRenaming] = useState(false);
	if (isRenaming) {
		return (
			<div
				className={isPicked ? "wg-kit-side-panel-row is-picked" : "wg-kit-side-panel-row"}
				style={{ paddingLeft: sidePanelIndentOf(depth) }}
			>
				{icon}
				<NameField
					name={name}
					className="sumi-canvas-row-field"
					onDone={(typed) => {
						setRenaming(false);

						if (typed !== null) {
							onRename(typed);
						}
					}}
				/>
				{end}
			</div>
		);
	}

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<SidePanelRow
					icon={icon}
					label={name}
					end={end}
					depth={depth}
					isPicked={isPicked}
					onClick={onPick}
					onDoubleClick={() => setRenaming(true)}
				/>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onSelect={() => setRenaming(true)}>{RENAME}</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem variant="destructive" onSelect={onDelete}>
					{DELETE}
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
