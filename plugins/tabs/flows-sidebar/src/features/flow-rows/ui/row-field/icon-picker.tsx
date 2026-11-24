import { createElement as h, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { Icon, Segmented, tooltipMarks } from "@widgetarium/kit";
import type { FlowIcon } from "@widgetarium/navigation/contract";
import { iconChoicesOf } from "../../lib/icon-choices.js";
import type { IconChoice, PickerTab } from "../../lib/icon-choices.js";
import { choiceIdOf, useChoiceGrid } from "../../lib/use-choice-grid.js";
import type { ChoiceGrid as ChoiceGridState } from "../../lib/use-choice-grid.js";
import { ChoiceGrid } from "./choice-grid.js";
import { ColorDots } from "./color-dots.js";
import type { ColorChoice } from "./color-dots.js";

const REMOVE_ICON = "Remove icon";
const TAB_LABEL: Readonly<Record<PickerTab, string>> = {
	icons: "Icons",
	emoji: "Emoji",
};
const TABS = (["icons", "emoji"] as const).map((value) => ({
	value,
	label: TAB_LABEL[value],
}));
const SEARCH_PLACEHOLDER: Readonly<Record<PickerTab, string>> = {
	icons: "Search icons",
	emoji: "Search emoji",
};

export interface IconPickerProps {
	readonly icon: FlowIcon | null;
	readonly color?: ColorChoice | undefined;
	readonly onPick: (icon: FlowIcon | null) => void;
}

export function IconPicker({ icon, color, onPick }: IconPickerProps): ReactElement {
	const [tab, setTab] = useState<PickerTab>(icon?.kind === "emoji" ? "emoji" : "icons");
	const [typed, setTyped] = useState("");
	const searchRef = useRef<HTMLInputElement | null>(null);
	const gridId = useId();
	const choices = useMemo(() => iconChoicesOf(tab, typed), [tab, typed]);
	const grid = useChoiceGrid({
		count: choices.length,
		listKey: `${tab}:${typed}`,
	});
	const showTab = (shown: PickerTab): void => {
		setTab(shown);
		searchRef.current?.focus();
	};
	return (
		<div className="sumi-flows-picker">
			{color === undefined ? null : <ColorDots choice={color} />}
			<Segmented items={TABS} value={tab} onValueChange={showTab} size="s" className="sumi-flows-picker-tabs" />
			<div className="sumi-flows-picker-search">
				<label className="sumi-flows-picker-field">
					<Icon name="search" />
					<input
						ref={searchRef}
						className="sumi-flows-picker-input"
						placeholder={SEARCH_PLACEHOLDER[tab]}
						value={typed}
						autoFocus
						role="combobox"
						aria-expanded={true}
						aria-controls={gridId}
						aria-activedescendant={grid.activeIndex < 0 ? undefined : choiceIdOf(gridId, grid.activeIndex)}
						onChange={(event) => setTyped(event.currentTarget.value)}
						onKeyDown={(event) => pickWithKey(event, grid, choices[grid.activeIndex], onPick)}
					/>
				</label>
				<button
					type="button"
					className="sumi-flows-picker-remove"
					aria-label={REMOVE_ICON}
					{...tooltipMarks({ said: REMOVE_ICON })}
					disabled={icon === null}
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => onPick(null)}
				>
					<Icon name="trash" />
				</button>
			</div>
			<ChoiceGrid id={gridId} label={TAB_LABEL[tab]} choices={choices} picked={icon} grid={grid} onPick={onPick} />
		</div>
	);
}

function pickWithKey(
	event: KeyboardEvent,
	grid: ChoiceGridState,
	active: IconChoice | undefined,
	onPick: (icon: FlowIcon) => void,
): void {
	if (event.key === "Enter" && active !== undefined) {
		event.preventDefault();
		onPick(active.icon);
		return;
	}

	if (grid.moveWithKey(event.key)) {
		event.preventDefault();
		event.stopPropagation();
	}
}
