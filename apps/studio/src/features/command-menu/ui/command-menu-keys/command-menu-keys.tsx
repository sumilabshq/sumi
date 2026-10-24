import { useEffect } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { ToggleCommandMenuCommand } from "@widgetarium/command-menu";
import type { Door } from "@widgetarium/command-menu";

const DOOR_OF_KEY: Readonly<Record<string, Door>> = {
	KeyK: "anywhere",
	KeyL: "this-tab",
};

export function CommandMenuKeys(): null {
	const { run } = useCommand(ToggleCommandMenuCommand);
	useEffect(() => {
		const pressed = (event: KeyboardEvent): void => {
			const door = DOOR_OF_KEY[event.code];

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
