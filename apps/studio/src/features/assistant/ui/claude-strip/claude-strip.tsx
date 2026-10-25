import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery, useQuery } from "@widgetarium/core/requests";
import { ClaudeOptionButtons } from "./claude-option-buttons.js";
import { FolderButton } from "./folder-button.js";
import { AgentSetupQuery, ClaudeOptionsQuery, WorkingFoldersQuery } from "@widgetarium/assistant";

const CLAUDE_CODE = "claude-code";

export function ClaudeStrip({ isEmpty }: { readonly isEmpty: boolean }): ReactElement {
	const { data: setup } = useQuery(AgentSetupQuery);
	const { data: options } = useQuery(ClaudeOptionsQuery);
	const folders = useOptionalQuery(WorkingFoldersQuery).data ?? null;
	const claude = setup.chosen === CLAUDE_CODE ? options : null;
	return (
		<div className="wg-studio-ai-strip" data-claude-strip={claude === null ? undefined : ""}>
			{isEmpty && folders !== null ? <FolderButton folders={folders} /> : null}
			{claude === null ? null : <ClaudeOptionButtons claude={claude} />}
		</div>
	);
}
