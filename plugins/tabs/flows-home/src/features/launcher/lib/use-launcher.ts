import { useState } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { commandMenu } from "@sumi/command-menu/contract";
import type { Launch, PaneSpot } from "./launch-types.js";
import { launchOf, queryTextOf } from "./launch-of.js";
import { useLaunchActs } from "./use-launch-acts.js";

const HOME_DOOR = "home";

export interface Launcher {
	readonly text: string;
	readonly launch: Launch | null;
	setText(text: string): void;
	submit(): void;
}

export function useLauncher(spot: PaneSpot): Launcher {
	const [text, setText] = useState("");
	const said = text.trim();
	const results = useOptionalQuery(commandMenu.results.all, {
		text: queryTextOf(said),
		door: HOME_DOOR,
		pageId: null,
	}).data;
	const launch = launchOf(said, results);
	const run = useLaunchActs(spot);
	return {
		text,
		launch,
		setText,
		submit: () => {
			if (launch !== null) {
				run(launch);
				setText("");
			}
		},
	};
}
