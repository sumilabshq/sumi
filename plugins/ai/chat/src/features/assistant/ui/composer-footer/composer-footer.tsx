import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { useChatKey } from "../../../../shared/lib/chat-key-context.js";
import { ComposerOptions } from "../../../../shared/ui/composer-options/composer-options.js";

export function ComposerFooter(): ReactElement {
	const chat = useChatKey();
	const options = useOptionalQuery(assistant.runners.getOptions, { chat }).data ?? [];
	return (
		<div className="wg-studio-ai-strip" data-claude-strip={options.length === 0 ? undefined : ""}>
			<ComposerOptions chat={chat} surface="chat" />
		</div>
	);
}
