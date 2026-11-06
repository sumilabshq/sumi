import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery, useQuery } from "@widgetarium/data-framework";
import { shownClaudeOptions } from "../../lib/shown-claude-options.js";
import { ClaudeOptionButtons } from "./claude-option-buttons.js";
import { FolderButton } from "./folder-button.js";
import { ModelButton } from "./model-button.js";
import { UsageButton } from "./usage-button.js";
import { AgentSetupQuery, ClaudeOptionsQuery, WorkingFoldersQuery } from "@widgetarium/assistant";

export function ClaudeStrip({ isEmpty }: { readonly isEmpty: boolean }): ReactElement {
	const { data: setup } = useQuery(AgentSetupQuery);
	const { data: options } = useQuery(ClaudeOptionsQuery);
	const folders = useOptionalQuery(WorkingFoldersQuery).data ?? null;
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
