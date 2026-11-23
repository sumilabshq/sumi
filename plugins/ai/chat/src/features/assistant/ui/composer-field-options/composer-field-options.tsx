import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useChatKey } from "../../../../shared/lib/chat-key-context.js";
import { ComposerOptionsField } from "../../../../shared/ui/composer-options/composer-options.js";

export function ComposerFieldOptions(): ReactElement {
	return <ComposerOptionsField chat={useChatKey()} surface="chat" />;
}
