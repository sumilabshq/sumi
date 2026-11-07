import { useEffect, useRef } from "react";
import { AppTabQuery, OpenInSystemAppCommand, RecordAppPageCommand, TakeActionPressCommand } from "@sumi/contract";
import type { AppPage } from "@sumi/contract";
import { useRuntime, useOptionalQuery } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";

export interface FileActionsAsk {
	readonly tabId: string;
	readonly path: string;
	readonly copied: () => string;
}

type ActionRuns = Readonly<Record<string, () => void>>;

const COPY = "copy";
const OPEN_IN_SYSTEM_APP = "open-in-system-app";
const ACTIONS: AppPage["actions"] = [
	{
		id: COPY,
		label: "Copy",
		icon: "copy",
	},
	{
		id: OPEN_IN_SYSTEM_APP,
		label: "Open in system app",
		icon: "external-link",
	},
];
const NO_PRESSES: readonly { readonly id: string }[] = [];
const FAILED = "[files] {what} for {path} failed: {reason}";

export function useOffersFileActions(ask: FileActionsAsk): void {
	const shell = useRuntime("useOffersFileActions");
	const latest = useRef(ask);
	latest.current = ask;
	useTakesPresses(shell, ask.tabId, {
		[COPY]: () => void copyToClipboard(latest.current),
		[OPEN_IN_SYSTEM_APP]: () => void openInSystemApp(shell, latest.current.path),
	});
	useEffect(() => {
		const title = ask.path.slice(ask.path.lastIndexOf("/") + 1);
		recordPage(shell, {
			id: ask.tabId,
			title,
			actions: ACTIONS,
		});
		return () =>
			recordPage(shell, {
				id: ask.tabId,
				actions: [],
			});
	}, [shell, ask.tabId, ask.path]);
}

function useTakesPresses(shell: Runtime, tabId: string, runs: ActionRuns): void {
	const presses = useOptionalQuery(AppTabQuery, { id: tabId }).data?.presses ?? NO_PRESSES;
	const latestRuns = useRef(runs);
	latestRuns.current = runs;
	const seen = useRef(new Set<string>());
	useEffect(() => {
		for (const { id } of presses.filter((press) => !seen.current.has(press.id))) {
			seen.current.add(id);
			void shell.send(TakeActionPressCommand, { id: tabId, press: id }).then((taken) => {
				if (taken.ok) {
					latestRuns.current[taken.output.action]?.();
				}
			});
		}
	}, [shell, tabId, presses]);
}

async function copyToClipboard({ path, copied }: FileActionsAsk): Promise<void> {
	await navigator.clipboard.writeText(copied()).catch((error: unknown) => reportFailure("copy", path, String(error)));
}

async function openInSystemApp(shell: Runtime, path: string): Promise<void> {
	const opened = await shell.send(OpenInSystemAppCommand, { path });

	if (!opened.ok) {
		reportFailure("open in system app", path, opened.reason);
	}
}

function recordPage(shell: Runtime, page: AppPage): void {
	void shell.send(RecordAppPageCommand, page).then((answer) => {
		if (!answer.ok) {
			reportFailure("record the page", page.id, answer.reason);
		}
	});
}

function reportFailure(what: string, path: string, reason: string): void {
	console.error(FAILED.replace("{what}", what).replace("{path}", path).replace("{reason}", reason));
}
