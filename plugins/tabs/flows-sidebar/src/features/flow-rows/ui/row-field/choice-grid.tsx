import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { FlowIcon } from "@widgetarium/navigation/contract";
import { FlowGlyph } from "../../../../shared/ui/flow-glyph/flow-glyph.js";
import { isPickedChoice } from "../../lib/icon-choices.js";
import type { IconChoice } from "../../lib/icon-choices.js";
import { GRID_COLUMNS, GRID_ROW_PX, GRID_VIEW_ROWS, choiceIdOf } from "../../lib/use-choice-grid.js";
import type { ChoiceGrid as ChoiceGridState } from "../../lib/use-choice-grid.js";

const NOTHING_FOUND = "Nothing matches";

export interface ChoiceGridProps {
	readonly id: string;
	readonly label: string;
	readonly choices: readonly IconChoice[];
	readonly picked: FlowIcon | null;
	readonly grid: ChoiceGridState;
	readonly onPick: (icon: FlowIcon) => void;
}

export function ChoiceGrid({ id, label, choices, picked, grid, onPick }: ChoiceGridProps): ReactElement {
	if (choices.length === 0) {
		return <p className="sumi-flows-picker-none">{NOTHING_FOUND}</p>;
	}

	const rows = Array.from({ length: grid.endRow - grid.firstRow }, (_, offset) => grid.firstRow + offset);
	return (
		<div
			ref={grid.scrollRef}
			className="sumi-flows-picker-grid"
			style={{ height: GRID_VIEW_ROWS * GRID_ROW_PX }}
			onScroll={grid.onScroll}
			onMouseDown={(event) => event.preventDefault()}
		>
			<div
				id={id}
				role="listbox"
				aria-label={label}
				className="sumi-flows-picker-rows"
				style={{ height: grid.rowCount * GRID_ROW_PX }}
			>
				{rows.map((row) => (
					<div key={row} role="presentation" className="sumi-flows-picker-row" style={{ top: row * GRID_ROW_PX }}>
						{choices.slice(row * GRID_COLUMNS, (row + 1) * GRID_COLUMNS).map((choice, column) => {
							const index = row * GRID_COLUMNS + column;
							return (
								<button
									key={choice.key}
									id={choiceIdOf(id, index)}
									type="button"
									role="option"
									tabIndex={-1}
									className="sumi-flows-picker-choice"
									title={choice.label}
									aria-label={choice.label}
									aria-selected={isPickedChoice(choice, picked)}
									data-active={index === grid.activeIndex ? "" : undefined}
									onClick={() => onPick(choice.icon)}
								>
									<FlowGlyph icon={choice.icon} fallback="dot" scale="choice" />
								</button>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}
