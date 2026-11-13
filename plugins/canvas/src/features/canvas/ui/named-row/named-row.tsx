import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@widgetarium/kit";
import { rowIndentOf } from "../../lib/row-indent.js";
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

export function NamedRow({ name, isPicked, depth, icon, end, onPick, onRename, onDelete }: NamedRowProps): ReactElement {
	const [isRenaming, setRenaming] = useState(false);
	const look = isPicked ? "sumi-canvas-row is-picked" : "sumi-canvas-row";

	if (isRenaming) {
		return (
			<div className={look} style={{ paddingLeft: rowIndentOf(depth) }}>
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
				<button
					type="button"
					className={look}
					style={{ paddingLeft: rowIndentOf(depth) }}
					aria-current={isPicked ? "true" : undefined}
					onClick={onPick}
					onDoubleClick={() => setRenaming(true)}
				>
					{icon}
					<span className="sumi-canvas-row-name">{name}</span>
					{end}
				</button>
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
