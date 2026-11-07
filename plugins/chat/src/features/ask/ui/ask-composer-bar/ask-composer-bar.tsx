import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { AgentSetupQuery, ClaudeOptionsQuery, WorkingFoldersQuery } from "@widgetarium/assistant";
import { shownClaudeOptions } from "../../../../shared/lib/shown-claude-options.js";
import { ClaudeOptionButtons } from "../../../assistant/ui/claude-strip/claude-option-buttons.js";
import { FolderButton } from "../../../assistant/ui/claude-strip/folder-button.js";
import { ModelButton } from "../../../assistant/ui/claude-strip/model-button.js";
import { ComposerTools } from "../../../assistant/ui/composer/composer-tools.js";
import { DraftAttachments } from "../../../assistant/ui/composer/draft-attachments.js";

const ASK_COMPOSER_CHAT = {
	chat: null,
};

export function AskComposerBar(): ReactElement {
	const setup = useOptionalQuery(AgentSetupQuery, ASK_COMPOSER_CHAT).data;
	const options = useOptionalQuery(ClaudeOptionsQuery, ASK_COMPOSER_CHAT).data;
	const folders = useOptionalQuery(WorkingFoldersQuery, ASK_COMPOSER_CHAT).data;
	const claude = shownClaudeOptions(setup, options);
	return (
		<>
			<DraftAttachments />
			<div className="wg-studio-ai-field-bar">
				<ComposerTools />
				{folders === null ? null : <FolderButton folders={folders} />}
				{claude === null || setup === null ? null : (
					<ClaudeOptionButtons claude={claude} modelButton={<ModelButton setup={setup} claude={claude} />} />
				)}
			</div>
		</>
	);
}
