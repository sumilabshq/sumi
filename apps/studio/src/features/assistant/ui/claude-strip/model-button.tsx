import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useMenuOpening } from "../../lib/menu-spot.js";
import { MODEL_FACES } from "../../lib/strip-faces.js";
import { ModelMenu } from "./model-menu.js";
import { StripButton } from "./strip-button.js";
import type { ClaudeOptions } from "@widgetarium/assistant";

const MODEL = "Model";

export function ModelButton({ claude }: { readonly claude: ClaudeOptions }): ReactElement {
	const model = useMenuOpening();
	return (
		<>
			<StripButton label={MODEL} isOn={model.spot !== null} onOpen={model.openAt}>
				{MODEL_FACES[claude.model].label}
			</StripButton>
			<ModelMenu opening={model} claude={claude} />
		</>
	);
}
