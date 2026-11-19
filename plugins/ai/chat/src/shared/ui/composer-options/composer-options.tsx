import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";

export type ComposerSurface = "chat" | "ask";

export interface ComposerOptionProps {
	readonly chat: string | null;
	readonly surface: ComposerSurface;
}

export interface ComposerOptionsProps extends ComposerOptionProps {
	readonly isEmptyChat: boolean;
}

export function ComposerOptions({ chat, surface, isEmptyChat }: ComposerOptionsProps): ReactElement {
	return (
		<>
			<ListPluginSlot name="chat.options-start" props={{ chat, surface }} />
			<span className="wg-studio-ai-strip-space" />
			{isEmptyChat ? <ListPluginSlot name="chat.empty-options" props={{ chat }} /> : null}
			<ListPluginSlot name="chat.options-end" props={{ chat, surface }} />
		</>
	);
}
