import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import type { ComposerInput } from "@sumi/chat-plugin";
import { useShowsLanguageSwitch } from "../../lib/use-shows-language-switch.js";

export function KeyboardLanguageTag({ input }: { readonly input: ComposerInput }): ReactElement | null {
	const tag = useShowsLanguageSwitch(input.box);

	if (tag === null) {
		return null;
	}

	return createPortal(
		<span
			className={tag.isShown ? "sumi-keyboard-language-tag is-shown" : "sumi-keyboard-language-tag"}
			role="status"
			style={{
				left: tag.anchor.left,
				top: tag.anchor.middle,
			}}
		>
			{tag.label}
		</span>,
		document.body,
	);
}
