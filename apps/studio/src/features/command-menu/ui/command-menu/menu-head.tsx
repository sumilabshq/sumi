import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Door } from "@widgetarium/command-menu";
import { doorKeysOf } from "../../lib/menu-key-labels.js";

export interface MenuHeadProps {
	readonly door: Door;
	readonly foundCount: number | null;
	readonly onDoor: (door: Door) => void;
}

interface Mode {
	readonly door: Door;
	readonly label: string;
}

const MODES: readonly Mode[] = [
	{
		door: "anywhere",
		label: "Suggested",
	},
	{
		door: "new-tab",
		label: "New",
	},
	{
		door: "ask",
		label: "Ask",
	},
];

export function MenuHead({ door, foundCount, onDoor }: MenuHeadProps): ReactElement {
	return (
		<div className="wg-cm-head">
			{MODES.map((mode) => (
				<button
					key={mode.door}
					type="button"
					className="wg-cm-mode"
					data-cm-mode={mode.door}
					aria-pressed={mode.door === door}
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => onDoor(mode.door)}
				>
					{mode.label}
					{mode.door === door && foundCount !== null ? <span className="wg-cm-mode-count">{foundCount}</span> : null}
					<kbd className="wg-cm-mode-keys">{doorKeysOf(mode.door)}</kbd>
				</button>
			))}
		</div>
	);
}
