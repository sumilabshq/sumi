import { useEffect } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { OpenWorkspaceByPositionCommand } from "../../contract.js";

const DIGIT_KEY = /^Digit([1-9])$/;

export function WorkspaceKeys(): null {
	const { run } = useCommand(OpenWorkspaceByPositionCommand);
	useEffect(() => {
		const pressed = (event: KeyboardEvent): void => {
			const digit = DIGIT_KEY.exec(event.code)?.[1];
			if (digit === undefined || !isCommandAlone(event)) {
				return;
			}

			event.preventDefault();
			void run({ position: Number(digit) - 1 });
		};
		window.addEventListener("keydown", pressed);
		return () => window.removeEventListener("keydown", pressed);
	}, [run]);
	return null;
}

function isCommandAlone(event: KeyboardEvent): boolean {
	return event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}
