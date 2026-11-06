import { createElement as h, useEffect, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { RecordAppPageCommand, catchLinks, wearSumiTheme } from "@sumi/contract";
import { TerminalPage } from "./terminal/terminal-page.js";
import type { SumiShell } from "./sumi-shell.js";

const APP_NAME = "Terminal";
const DARK_CLASS = "dark";
const FAVICON = "favicon.svg";
const SUMI_APP_PROTOCOL = "sumi-app:";
const CLASS_CHANGES: MutationObserverInit = {
	attributes: true,
	attributeFilter: ["class"],
};

export interface TerminalRootProps {
	readonly sumi: SumiShell;
}

export function TerminalRoot({ sumi }: TerminalRootProps): ReactElement {
	const isDark = useIsDark();
	useWearsSumi(sumi);
	useRecordsPage(sumi);
	return (
		<main className="wg-terminal-app wg-app-body" aria-label={APP_NAME}>
			<TerminalPage sumi={sumi} isDark={isDark} />
		</main>
	);
}

function useWearsSumi({ shell, transport, tabId }: SumiShell): void {
	useEffect(() => wearSumiTheme({ sumi: shell, transport }), [shell, transport]);
	useEffect(() => (tabId === null ? undefined : catchLinks({ sumi: shell, tabId })), [shell, tabId]);
}

function useRecordsPage({ shell, tabId }: SumiShell): void {
	useEffect(() => {
		if (tabId === null) {
			return;
		}

		const favicon = location.protocol === SUMI_APP_PROTOCOL ? { favicon: new URL(FAVICON, location.href).href } : {};
		void shell.send(RecordAppPageCommand, {
			id: tabId,
			title: APP_NAME,
			...favicon,
		});
	}, [shell, tabId]);
}

function useIsDark(): boolean {
	return useSyncExternalStore(watchRootClass, () => document.documentElement.classList.contains(DARK_CLASS));
}

function watchRootClass(changed: () => void): () => void {
	const observer = new MutationObserver(changed);
	observer.observe(document.documentElement, CLASS_CHANGES);
	return () => observer.disconnect();
}
