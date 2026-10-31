import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useMenuOpening } from "../../lib/menu-spot.js";
import { MODEL_FACES, providerLabelOf } from "../../lib/strip-faces.js";
import { ModelMenu } from "./model-menu.js";
import { StripButton } from "./strip-button.js";
import type { AgentSetup, ClaudeOptions } from "@widgetarium/assistant";

const MODEL = "Model";

export interface ModelButtonProps {
	readonly setup: AgentSetup;
	readonly claude: ClaudeOptions | null;
}

export function ModelButton({ setup, claude }: ModelButtonProps): ReactElement {
	const model = useMenuOpening();
	return (
		<>
			<StripButton label={MODEL} isOn={model.spot !== null} onOpen={model.openAtCentre}>
				{claude === null ? providerLabelOf(setup, setup.chosen) : MODEL_FACES[claude.model].label}
			</StripButton>
			<ModelMenu opening={model} setup={setup} claude={claude} />
		</>
	);
}
