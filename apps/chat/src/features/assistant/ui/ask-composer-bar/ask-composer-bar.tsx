import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { AgentSetupQuery, ClaudeOptionsQuery, WorkingFoldersQuery } from "@widgetarium/assistant";
import { shownClaudeOptions } from "../../lib/shown-claude-options.js";
import { ClaudeOptionButtons } from "../claude-strip/claude-option-buttons.js";
import { FolderButton } from "../claude-strip/folder-button.js";
import { ModelButton } from "../claude-strip/model-button.js";
import { ComposerTools } from "../composer/composer-tools.js";
import { DraftAttachments } from "../composer/draft-attachments.js";

export function AskComposerBar(): ReactElement {
	const setup = useOptionalQuery(AgentSetupQuery).data;
	const options = useOptionalQuery(ClaudeOptionsQuery).data;
	const folders = useOptionalQuery(WorkingFoldersQuery).data;
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
