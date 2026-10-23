import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery, useQuery } from "@widgetarium/core/requests";
import { AgentSetupQuery, ClaudeOptionsQuery, WorkingFoldersQuery } from "../../contract.js";
import { ClaudeOptionButtons } from "./claude-option-buttons.js";
import { FolderButton } from "./folder-button.js";
import { ModelButton } from "./model-button.js";

const CLAUDE_CODE = "claude-code";

export function ClaudeStrip({ isEmpty }: { readonly isEmpty: boolean }): ReactElement {
	const { data: setup } = useQuery(AgentSetupQuery);
	const { data: options } = useQuery(ClaudeOptionsQuery);
	const folders = useOptionalQuery(WorkingFoldersQuery).data ?? null;
	const claude = setup.chosen === CLAUDE_CODE ? options : null;
	const chosenLabel = setup.providers.find(({ id }) => id === setup.chosen)?.label ?? setup.providerLabel;
	return (
		<div className="wg-studio-ai-strip" data-claude-strip={claude === null ? undefined : ""}>
			{isEmpty && folders !== null ? <FolderButton folders={folders} /> : null}
			{claude === null ? (
				<>
					<span className="wg-studio-ai-strip-space" />
					<ModelButton claude={null} shown={chosenLabel} />
				</>
			) : (
				<ClaudeOptionButtons claude={claude} />
			)}
		</div>
	);
}
