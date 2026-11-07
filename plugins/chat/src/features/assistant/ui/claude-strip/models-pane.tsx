import { createElement as h } from "react";
import type { ReactElement } from "react";
import { CLAUDE_CODE_PROVIDER_ID } from "../../lib/shown-claude-options.js";
import { MODEL_FACES, providerLabelOf } from "../../lib/strip-faces.js";
import { ChatMenuLabel } from "../chat-menu/chat-menu-label.js";
import { ChatMenuRow } from "../chat-menu/chat-menu-row.js";
import { ClaudeModelSchema } from "@widgetarium/assistant";
import type { AgentSetup, ClaudeModel, ClaudeOptions } from "@widgetarium/assistant";

export interface ModelsPaneProps {
	readonly setup: AgentSetup;
	readonly claude: ClaudeOptions | null;
	readonly shownProviderId: string;
	readonly onPickModel: (model: ClaudeModel) => void;
	readonly onPickProvider: (id: string) => void;
}

const MODEL = "Model";
const DEFAULT_MODEL = "Default model";
const SET_IN = "Set in {provider}";

export function ModelsPane({
	setup,
	claude,
	shownProviderId,
	onPickModel,
	onPickProvider,
}: ModelsPaneProps): ReactElement {
	return (
		<div className="wg-studio-ai-menu-pane">
			<ChatMenuLabel>{MODEL}</ChatMenuLabel>
			{shownProviderId === CLAUDE_CODE_PROVIDER_ID ? (
				ClaudeModelSchema.options.map((model) => (
					<ChatMenuRow
						key={model}
						text={MODEL_FACES[model].label}
						small={MODEL_FACES[model].small}
						isPicked={model === claude?.model}
						onPick={() => onPickModel(model)}
					/>
				))
			) : (
				<ChatMenuRow
					text={DEFAULT_MODEL}
					small={SET_IN.replace("{provider}", providerLabelOf(setup, shownProviderId))}
					isPicked={setup.chosen === shownProviderId}
					onPick={() => onPickProvider(shownProviderId)}
				/>
			)}
		</div>
	);
}
