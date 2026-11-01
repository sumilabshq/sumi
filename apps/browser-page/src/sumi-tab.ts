import { AppTabQuery, RecordAppPageCommand } from "@sumi/contract";
import type { SumiShell } from "./sumi-shell.js";

export interface TabPage {
	readonly address?: string;
	readonly how?: "push" | "replace";
	readonly title?: string;
	readonly favicon?: string;
}

export class SumiTab {
	constructor(private readonly shell: SumiShell) {}

	async address(): Promise<string> {
		const tab = await this.shell.app.send(AppTabQuery, {
			id: this.shell.tabId,
		});

		if (!tab.ok) {
			throw new Error(tab.reason);
		}

		return tab.output.address ?? "";
	}

	async record(page: TabPage): Promise<void> {
		const recorded = await this.shell.app.send(RecordAppPageCommand, {
			id: this.shell.tabId,
			...page,
		});

		if (!recorded.ok) {
			throw new Error(`Sumi refused the tab's page: ${recorded.reason}`);
		}
	}

	changes(hear: () => void): () => void {
		return this.shell.transport.changes(hear);
	}
}
