import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useChatKey } from "../../../../shared/lib/chat-key-context.js";
import { ComposerOptionsEnd } from "../../../../shared/ui/composer-options/composer-options.js";

export function ComposerMeter(): ReactElement {
	return <ComposerOptionsEnd chat={useChatKey()} surface="chat" />;
}
