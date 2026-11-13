import { createElement as h, Fragment, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import type { ComposerInput } from "@sumi/chat-plugin";
import { useSlashMenu } from "../../lib/use-slash-menu.js";
import { CommandHighlight } from "./command-highlight.js";
import { SlashMenuPanel } from "./slash-menu-panel.js";

export function SlashCommands({ input }: { readonly input: ComposerInput }): ReactElement {
	const slash = useSlashMenu(input);
	const mirror = useRef<HTMLDivElement>(null);
	const hasCommand = slash.pieces !== null;
	const { box, hideBoxText } = input;
	useEffect(() => {
		const field = box.current;
		hideBoxText(hasCommand);

		if (field === null) {
			return () => hideBoxText(false);
		}

		const follow = (): void => {
			if (mirror.current !== null) {
				mirror.current.scrollTop = field.scrollTop;
			}
		};
		field.addEventListener("scroll", follow);
		return () => {
			hideBoxText(false);
			field.removeEventListener("scroll", follow);
		};
	}, [box, hideBoxText, hasCommand]);
	return (
		<>
			{slash.pieces === null ? null : <CommandHighlight pieces={slash.pieces} mirror={mirror} />}
			{slash.isOpen ? <SlashMenuPanel slash={slash} draft={input.draft} /> : null}
		</>
	);
}
