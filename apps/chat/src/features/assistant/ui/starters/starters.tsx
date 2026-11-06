import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/framework";
import { PrefillDraftCommand } from "@widgetarium/assistant";
import { SKILL_ENTRIES } from "../../lib/slash-matches.js";

const TITLE_OF: Readonly<Record<string, string>> = {
	"create-app": "Create an app",
	"design-app": "Design the app",
};

export function Starters(): ReactElement {
	const prefillDraft = useCommand(PrefillDraftCommand);
	return (
		<div className="wg-studio-ai-starters">
			{SKILL_ENTRIES.map(({ name, icon }) => (
				<button
					key={name}
					type="button"
					className="wg-studio-ai-starter"
					data-starter={name}
					onClick={() => void prefillDraft.run({ text: `/${name} ` })}
				>
					<Icon name={icon} size={16} className="wg-studio-ai-starter-icon" />
					{TITLE_OF[name] ?? `/${name}`}
				</button>
			))}
		</div>
	);
}
