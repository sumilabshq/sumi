import { useEffect } from "react";
import { useCommand } from "@widgetarium/framework";
import { ToggleCommandMenuCommand } from "@widgetarium/command-menu";
import { doorOfLetter } from "../../lib/menu-key-labels.js";

const LETTER_CODE = /^Key([A-Z])$/;

export function CommandMenuKeys(): null {
	const { run } = useCommand(ToggleCommandMenuCommand);
	useEffect(() => {
		const pressed = (event: KeyboardEvent): void => {
			const door = doorOfLetter(LETTER_CODE.exec(event.code)?.[1]?.toLowerCase() ?? "");

			if (door === undefined || event.defaultPrevented || !isCommandAlone(event)) {
				return;
			}

			event.preventDefault();
			void run({ door, text: door === "this-tab" ? null : "" });
		};
		window.addEventListener("keydown", pressed);
		return () => window.removeEventListener("keydown", pressed);
	}, [run]);
	return null;
}

function isCommandAlone(event: KeyboardEvent): boolean {
	return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
}
