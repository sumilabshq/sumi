import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Pressable } from "@widgetarium/kit";
import type { Door, MenuDoor } from "@sumi/command-menu/contract";

export interface MenuHeadProps {
	readonly door: Door;
	readonly doors: readonly MenuDoor[];
	readonly foundCount: number | null;
	readonly onDoor: (door: Door) => void;
}

export function MenuHead({ door, doors, foundCount, onDoor }: MenuHeadProps): ReactElement {
	return (
		<div className="wg-cm-head">
			{doors.map((mode) =>
				mode.label === null ? null : (
					<Pressable
						variant="quiet"
						tone="muted"
						key={mode.id}
						className="wg-cm-mode"
						data-cm-mode={mode.id}
						aria-pressed={mode.id === door}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => onDoor(mode.id)}
					>
						{mode.label}
						{mode.id === door && foundCount !== null ? <span className="wg-cm-mode-count">{foundCount}</span> : null}
						<kbd className="wg-cm-mode-keys">{mode.keys}</kbd>
					</Pressable>
				),
			)}
		</div>
	);
}
