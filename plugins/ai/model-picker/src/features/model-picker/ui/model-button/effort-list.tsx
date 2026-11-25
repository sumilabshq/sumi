import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { PopoverItem } from "@widgetarium/kit";
import type { EffortShown } from "../../lib/model-labels.js";
import { PaneHead } from "./pane-head.js";

export interface EffortListProps {
	readonly chat: string | null;
	readonly effort: EffortShown;
	readonly onPicked: () => void;
}

export function EffortList({ chat, effort, onPicked }: EffortListProps): ReactElement {
	const chooseOption = useCommand(assistant.runners.chooseOption);
	const { option, value } = effort;

	return (
		<Fragment>
			<PaneHead title={option.label} />
			<div className="sumi-pane-list sumi-effort-list">
				{option.choices.map((choice) => (
					<PopoverItem
						key={choice.value}
						checked={choice.value === value}
						sub={choice.note}
						onClick={() => {
							onPicked();
							void chooseOption.run({ chat, key: option.key, value: choice.value });
						}}
					>
						{choice.label}
					</PopoverItem>
				))}
			</div>
		</Fragment>
	);
}
