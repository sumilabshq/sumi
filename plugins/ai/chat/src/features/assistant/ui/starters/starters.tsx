import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { CHAT_SKILLS } from "../../../../shared/lib/chat-skills.js";
import { useChatKey } from "../../../../shared/lib/chat-key-context.js";

const TITLE_OF: Readonly<Record<string, string>> = {
	"create-app": "Create an app",
	"design-app": "Design the app",
};

export function Starters(): ReactElement {
	const chat = useChatKey();
	const prefillDraft = useCommand(assistant.prefill.prefillDraft);
	return (
		<div className="wg-studio-ai-starters">
			{CHAT_SKILLS.map(({ name, icon }) => (
				<button
					key={name}
					type="button"
					className="wg-studio-ai-starter"
					data-starter={name}
					onClick={() => void prefillDraft.run({ chat, text: `/${name} ` })}
				>
					<Icon name={icon} size={16} className="wg-studio-ai-starter-icon" />
					{TITLE_OF[name] ?? `/${name}`}
				</button>
			))}
		</div>
	);
}
