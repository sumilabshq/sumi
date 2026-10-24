import { ROOT } from "@widgetarium/core/paths.js";
import { reasonOf, reportToConsole } from "@widgetarium/core/requests";
import type { FailureReport } from "@widgetarium/core/requests";
import type WidgetariumPlugin from "../main.js";

export const SHOTS_DIR = `${ROOT}/shots`;
export const SHOT_REQUESTS_DIR = `${SHOTS_DIR}/requests`;

const SHOT_POLL_MS = 1000;
const SHOTS = "shot requests";
const NOT_DRAWN =
	"A shot is not taken: the canvas draws only on the GPU, and a GPU shot is not built yet. Read the design files instead.";

interface ShotTaker {
	readonly plugin: WidgetariumPlugin;
	readonly reportFailure: FailureReport;
}

export function answerShotRequests(plugin: WidgetariumPlugin): void {
	const taker: ShotTaker = { plugin, reportFailure: reportToConsole };
	const polling = { isBusy: false };
	const poll = async (): Promise<void> => {
		if (polling.isBusy) return;
		polling.isBusy = true;
		await answerPending(taker).catch((failure: unknown) => reportShotFailure(taker, SHOTS, failure));
		polling.isBusy = false;
	};
	plugin.registerInterval(window.setInterval(() => void poll(), SHOT_POLL_MS));
}

function reportShotFailure({ reportFailure }: ShotTaker, source: string, thrown: unknown): void {
	reportFailure({ source, reason: reasonOf(thrown), code: "failed", ran: false, thrown });
}

async function answerPending(taker: ShotTaker): Promise<void> {
	const { adapter } = taker.plugin.app.vault;
	if (!(await adapter.exists(SHOT_REQUESTS_DIR))) return;
	const { files } = await adapter.list(SHOT_REQUESTS_DIR);
	for (const path of files.filter((one) => one.endsWith(".json")))
		await refuseOne(taker, path).catch((failure: unknown) => reportShotFailure(taker, path, failure));
}

async function refuseOne(taker: ShotTaker, path: string): Promise<void> {
	const { adapter } = taker.plugin.app.vault;
	const id = path.slice(path.lastIndexOf("/") + 1, -".json".length);
	console.info(`[widgetarium] shot request ${id}: asked → refused (${NOT_DRAWN})`);
	await adapter.write(`${SHOTS_DIR}/${id}.failed.txt`, NOT_DRAWN);
	await adapter.remove(path);
}
