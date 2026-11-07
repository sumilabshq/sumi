import type { Runtime } from "@widgetarium/data-framework";

// TRADE-OFF: a canvas tab's runtime lives until its window closes; dropping it on tab close needs the held tabs here
export class KeptCanvases {
	private readonly started = new Map<string, Runtime>();

	canvasOf(key: string, start: () => Runtime): Runtime {
		const kept = this.started.get(key);

		if (kept !== undefined) {
			return kept;
		}

		const fresh = start();
		this.started.set(key, fresh);
		console.info(`[widgetarium] canvas ${key}: none → started (kept for its window)`);
		return fresh;
	}
}
