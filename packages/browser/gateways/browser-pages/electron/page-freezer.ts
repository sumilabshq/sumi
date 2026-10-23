import type { ElectronRemote } from "./electron-remote.js";

export class PageFreezer {
	private appliedFrozen = false;
	private wantedFrozen = false;

	constructor(
		private readonly remote: ElectronRemote,
		private readonly pageId: string,
	) {}

	request(wantsFrozen: boolean, webContentsId: number | null): void {
		this.wantedFrozen = wantsFrozen;
		this.apply(webContentsId);
	}

	apply(webContentsId: number | null): void {
		if (webContentsId === null || this.appliedFrozen === this.wantedFrozen) {
			return;
		}

		const isFreezing = this.wantedFrozen;
		const change = isFreezing ? "active → frozen" : "frozen → active";
		this.appliedFrozen = isFreezing;
		void this.remote
			.freeze(webContentsId, isFreezing)
			.then((method) => console.info(`[widgetarium] browser page ${this.pageId} ${change} (${method})`))
			.catch((failure: unknown) => {
				this.forgetFailed(isFreezing);
				console.error(`[widgetarium] browser page ${this.pageId} ${change} failed`, failure);
			});
	}

	resetForNewView(): void {
		this.appliedFrozen = false;
	}

	private forgetFailed(isFreezing: boolean): void {
		if (this.appliedFrozen === isFreezing) {
			this.appliedFrozen = !isFreezing;
		}
	}
}
