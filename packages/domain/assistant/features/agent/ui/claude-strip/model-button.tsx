import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useMenuOpening } from "../../../../shared/lib/menu-spot.js";
import type { ClaudeOptions } from "../../../../shared/schema/claude-options.schema.js";
import { ModelMenu } from "./model-menu.js";
import { StripButton } from "./strip-button.js";

export interface ModelButtonProps {
	readonly claude: ClaudeOptions | null;
	readonly shown: string;
}

const MODEL = "Model";

export function ModelButton({ claude, shown }: ModelButtonProps): ReactElement {
	const model = useMenuOpening();
	return (
		<>
			<StripButton label={MODEL} isOn={model.spot !== null} onOpen={model.openAt}>
				{shown}
			</StripButton>
			<ModelMenu opening={model} claude={claude} />
		</>
	);
}
