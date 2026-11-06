import { useEffect, useState } from "react";
import { AppTabQuery } from "@sumi/contract";
import type { Answer, HearChanges } from "@widgetarium/framework";
import type { SumiShell } from "./sumi/sumi-shell.js";
import type { TabRead } from "./tab-read.js";

interface AppTabAnswer {
	readonly chatId: string | null;
}

const KEPT_ON_FAILED_REREAD = "[widgetarium] chat tab {tab}: read → kept chat {chat}, its re-read was refused ({reason})";

export function useTabChat({ app, transport, tabId }: SumiShell): TabRead {
	const [tab, setTab] = useState<TabRead>({
		kind: "reading",
	});
	useEffect(() => {
		const reads = new AppTabReads(
			() =>
				app.send(AppTabQuery, {
					id: tabId,
				}),
			(answer) => setTab((held) => tabReadAfter(held, answer, tabId)),
		);
		reads.read();
		const stopHearing = transport.changes(rereadOnAppTabChange(() => reads.read()));
		return () => {
			stopHearing();
			reads.stop();
		};
	}, [app, transport, tabId]);
	return tab;
}

export function rereadOnAppTabChange(reread: () => void): HearChanges {
	return (invalidated) => {
		if (invalidated.some(({ query }) => query === AppTabQuery.name)) {
			reread();
		}
	};
}

export function tabReadAfter(held: TabRead, answer: Answer<AppTabAnswer>, tabId: string): TabRead {
	if (answer.ok) {
		return {
			kind: "read",
			chatId: answer.output.chatId,
		};
	}

	if (held.kind === "read") {
		console.warn(
			KEPT_ON_FAILED_REREAD.replace("{tab}", tabId)
				.replace("{chat}", held.chatId ?? "none")
				.replace("{reason}", answer.reason),
		);
		return held;
	}

	return {
		kind: "failed",
		reason: answer.reason,
	};
}

export class AppTabReads {
	private isReading = false;
	private isStale = false;
	private isStopped = false;

	constructor(
		private readonly send: () => Promise<Answer<AppTabAnswer>>,
		private readonly settle: (answer: Answer<AppTabAnswer>) => void,
	) {}

	read(): void {
		if (this.isReading) {
			this.isStale = true;
			return;
		}

		this.isReading = true;
		void this.send().then((answer) => this.settled(answer));
	}

	stop(): void {
		this.isStopped = true;
	}

	private settled(answer: Answer<AppTabAnswer>): void {
		this.isReading = false;

		if (this.isStopped) {
			return;
		}

		this.settle(answer);

		if (this.isStale) {
			this.isStale = false;
			this.read();
		}
	}
}
