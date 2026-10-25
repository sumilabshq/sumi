import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import type { MenuOpening } from "../../lib/menu-spot.js";
import { ChatMenu } from "../chat-menu/chat-menu.js";
import { ChatMenuRow } from "../chat-menu/chat-menu-row.js";
import { MODEL_FACES } from "../../lib/strip-faces.js";
import { ChooseClaudeOptionCommand } from "@widgetarium/assistant";
import type { ClaudeModel, ClaudeOptions } from "@widgetarium/assistant";

export interface ModelMenuProps {
	readonly opening: MenuOpening;
	readonly claude: ClaudeOptions;
}

const MODEL = "Model";

export function ModelMenu({ opening, claude }: ModelMenuProps): ReactElement {
	const choose = useCommand(ChooseClaudeOptionCommand);
	return (
		<ChatMenu spot={opening.spot} label={MODEL} onDismiss={opening.close}>
			{MODELS.map((model) => (
				<ChatMenuRow
					key={model}
					text={MODEL_FACES[model].label}
					small={MODEL_FACES[model].small}
					isPicked={model === claude.model}
					onPick={() => {
						opening.close();
						void choose.run({ model });
					}}
				/>
			))}
		</ChatMenu>
	);
}

const MODELS = Object.keys(MODEL_FACES).filter((value): value is ClaudeModel => value in MODEL_FACES);
