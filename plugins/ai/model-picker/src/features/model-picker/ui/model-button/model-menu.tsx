import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import type { RunnersShown } from "@widgetarium/assistant/contract";
import type { EffortShown } from "../../lib/model-labels.js";
import { EffortList } from "./effort-list.js";
import { ModelsPane } from "./models-pane.js";
import { ProvidersPane } from "./providers-pane.js";

export interface ModelMenuProps {
	readonly chat: string | null;
	readonly shown: RunnersShown;
	readonly effort: EffortShown | null;
	readonly onPicked: () => void;
}

export function ModelMenu({ chat, shown, effort, onPicked }: ModelMenuProps): ReactElement {
	const [browsedRunner, setBrowsedRunner] = useState<string | null>(null);
	const chooseModel = useCommand(assistant.runners.chooseModel);
	const openProviders = useCommand(assistant.agent.openProviders);
	const shownRunner = browsedRunner ?? shown.chosenRunner ?? shown.runners[0]?.id ?? "";
	const shownEffort = shownRunner === shown.chosenRunner ? effort : null;
	return (
		<div className="sumi-model-panes">
			<ProvidersPane
				shown={shown}
				shownRunner={shownRunner}
				onBrowse={setBrowsedRunner}
				onManage={() => {
					onPicked();
					void openProviders.run({ chat });
				}}
			/>
			<div role="separator" aria-orientation="vertical" className="sumi-model-pane-divider" />
			<ModelsPane
				shown={shown}
				shownRunner={shownRunner}
				onPick={(runner, model) => {
					onPicked();
					void chooseModel.run({ chat, runner, model });
				}}
				footer={shownEffort === null ? null : <EffortList chat={chat} effort={shownEffort} onPicked={onPicked} />}
			/>
		</div>
	);
}
