import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PopoverItem } from "@widgetarium/kit";
import type { RunnersShown } from "@widgetarium/assistant/contract";
import { PaneHead } from "./pane-head.js";

export interface ModelsPaneProps {
	readonly shown: RunnersShown;
	readonly shownRunner: string;
	readonly onPick: (runner: string, model: string) => void;
}

const MODEL = "Model";

export function ModelsPane({ shown, shownRunner, onPick }: ModelsPaneProps): ReactElement {
	return (
		<div className="sumi-model-pane">
			<PaneHead title={MODEL} />
			<div className="sumi-pane-list sumi-model-lists">
				{shown.runners.map((runner) => {
					const isShown = runner.id === shownRunner;
					return (
						<div
							key={runner.id}
							className="sumi-model-list"
							data-hidden={isShown ? undefined : ""}
							aria-hidden={!isShown}
							inert={!isShown}
						>
							{runner.models.map((model) => (
								<PopoverItem
									key={model.id}
									checked={shown.chosenRunner === runner.id && shown.chosenModel === model.id}
									sub={model.note}
									onClick={() => onPick(runner.id, model.id)}
								>
									{model.label}
								</PopoverItem>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
}
