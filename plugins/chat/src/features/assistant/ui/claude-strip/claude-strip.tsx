import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery, useQuery } from "@widgetarium/data-framework";
import { shownClaudeOptions } from "../../../../shared/lib/shown-claude-options.js";
import { ClaudeOptionButtons } from "./claude-option-buttons.js";
import { FolderButton } from "./folder-button.js";
import { ModelButton } from "./model-button.js";
import { UsageButton } from "./usage-button.js";
import { assistant } from "@widgetarium/assistant";
import { useChatKey } from "../../../../shared/lib/chat-key-context.js";

export function ClaudeStrip({ isEmpty }: { readonly isEmpty: boolean }): ReactElement {
	const chat = useChatKey();
	const { data: setup } = useQuery(assistant.agent.agentSetup, { chat });
	const { data: options } = useQuery(assistant.agent.claudeOptions, { chat });
	const folders = useOptionalQuery(assistant.agent.workingFolders, { chat }).data ?? null;
	const claude = shownClaudeOptions(setup, options);
	const modelButton = <ModelButton setup={setup} claude={claude} />;
	return (
		<div className="wg-studio-ai-strip" data-claude-strip={claude === null ? undefined : ""}>
			{isEmpty && folders !== null ? <FolderButton folders={folders} /> : null}
			{claude === null ? (
				<>
					<span className="wg-studio-ai-strip-space" />
					{modelButton}
				</>
			) : (
				<ClaudeOptionButtons claude={claude} usage={<UsageButton usage={claude.usage} />} modelButton={modelButton} />
			)}
		</div>
	);
}
