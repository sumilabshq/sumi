import { useEffect } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { MenuDoorsQuery, ToggleCommandMenuCommand } from "@sumi/command-menu";
import { doorOfLetter } from "../../lib/menu-key-labels.js";

const LETTER_CODE = /^Key([A-Z])$/;

export function CommandMenuKeys(): null {
	const { run } = useCommand(ToggleCommandMenuCommand);
	const { doors } = useQuery(MenuDoorsQuery).data;
	useEffect(() => {
		const pressed = (event: KeyboardEvent): void => {
			const door = doorOfLetter(LETTER_CODE.exec(event.code)?.[1]?.toLowerCase() ?? "", doors);

			if (door === undefined || event.defaultPrevented || !isCommandAlone(event)) {
				return;
			}

			event.preventDefault();
			void run({ door: door.id, text: door.startsWith === "shown-tab" ? null : "" });
		};
		window.addEventListener("keydown", pressed);
		return () => window.removeEventListener("keydown", pressed);
	}, [run, doors]);
	return null;
}

function isCommandAlone(event: KeyboardEvent): boolean {
	return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
}
