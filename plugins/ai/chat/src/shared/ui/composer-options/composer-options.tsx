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

export function ComposerOptionsStart({ chat, surface, isEmptyChat }: ComposerOptionsProps): ReactElement {
	return (
		<>
			<ListPluginSlot name="chat.options-start" props={{ chat, surface }} />
			{isEmptyChat ? <ListPluginSlot name="chat.empty-options" props={{ chat }} /> : null}
		</>
	);
}

export function ComposerOptionsField({ chat, surface }: ComposerOptionProps): ReactElement {
	return <ListPluginSlot name="chat.field-options" props={{ chat, surface }} />;
}

export function ComposerOptionsEnd({ chat, surface }: ComposerOptionProps): ReactElement {
	return <ListPluginSlot name="chat.options-end" props={{ chat, surface }} />;
}

export function ComposerOptions(props: ComposerOptionsProps): ReactElement {
	return (
		<>
			<ComposerOptionsField chat={props.chat} surface={props.surface} />
			<ComposerOptionsStart {...props} />
			<span className="wg-studio-ai-strip-space" />
			<ComposerOptionsEnd chat={props.chat} surface={props.surface} />
		</>
	);
}
