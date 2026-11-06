import { OpenWebPageCommand, PlaceWebPageCommand, ReloadWebPageCommand, WebPageQuery } from "@sumi/contract";
import type { PageArea, WebPage } from "@sumi/contract";
import type { Answer } from "@widgetarium/data-framework";
import type { SumiShell } from "./sumi-shell.js";

export class SumiWebPage {
	constructor(private readonly shell: SumiShell) {}

	async read(): Promise<WebPage | null> {
		return outputOf(
			await this.shell.app.send(WebPageQuery, {
				tab: this.shell.tabId,
			}),
		);
	}

	async open(url: string): Promise<void> {
		outputOf(
			await this.shell.app.send(OpenWebPageCommand, {
				tab: this.shell.tabId,
				url,
			}),
		);
	}

	async place(area: PageArea | null): Promise<void> {
		outputOf(
			await this.shell.app.send(PlaceWebPageCommand, {
				tab: this.shell.tabId,
				area,
			}),
		);
	}

	async reload(): Promise<void> {
		outputOf(await this.shell.app.send(ReloadWebPageCommand, this.tab()));
	}

	changes(hear: () => void): () => void {
		return this.shell.transport.changes(hear);
	}

	private tab(): { readonly tab: string } {
		return {
			tab: this.shell.tabId,
		};
	}
}

function outputOf<O>(answer: Answer<O>): O {
	if (!answer.ok) {
		throw new Error(answer.reason);
	}

	return answer.output;
}
