import { useEffect, useRef } from "react";
import { AppTabQuery, TakeActionPressCommand } from "@sumi/contract";
import { useApp, useOptionalQuery } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";

type ActionRuns = Readonly<Record<string, () => void>>;

interface PressTaking {
	readonly shell: StartedApp;
	readonly tabId: string;
	readonly runs: { readonly current: ActionRuns };
}

const NO_PRESSES: readonly { readonly id: string }[] = [];
const TAKE_REFUSED = "[browser-page] press {press} of tab {tab} not taken here: {reason}";
const NOT_SHOWN = "[browser-page] action {action} was pressed while no page shows it";

export function useTakesActionPresses(tabId: string, runs: ActionRuns): void {
	const shell = useApp("useTakesActionPresses");
	const presses = useOptionalQuery(AppTabQuery, { id: tabId }).data?.presses ?? NO_PRESSES;
	const latestRuns = useRef(runs);
	latestRuns.current = runs;
	const seenPressIds = useRef(new Set<string>());
	useEffect(() => {
		for (const { id } of presses.filter((press) => !seenPressIds.current.has(press.id))) {
			seenPressIds.current.add(id);
			void takePress({ shell, tabId, runs: latestRuns }, id);
		}
	}, [shell, tabId, presses]);
}

async function takePress({ shell, tabId, runs }: PressTaking, press: string): Promise<void> {
	const taken = await shell.send(TakeActionPressCommand, { id: tabId, press });

	if (!taken.ok) {
		console.info(TAKE_REFUSED.replace("{press}", press).replace("{tab}", tabId).replace("{reason}", taken.reason));
		return;
	}

	runPressedAction(runs.current, taken.output.action);
}

function runPressedAction(runs: ActionRuns, action: string): void {
	const run = runs[action];

	if (run === undefined) {
		console.warn(NOT_SHOWN.replace("{action}", action));
		return;
	}

	run();
}
