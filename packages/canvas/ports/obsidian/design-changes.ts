import { lookPathOf } from "@widgetarium/core/app-look.js";
import { designPathOf } from "@widgetarium/core/app-design.js";
import { specPathOf } from "@widgetarium/core/app-spec.js";
import type { Job, LiveJob } from "../../schema/job.js";
import type { DrawnDesign } from "../../schema/design.js";
import { blocksOf } from "../../requests/design/design-block-registry.js";
import { draftsOn, widgetsDrawnOn } from "../../requests/design/drawn-design.js";
import type { DesignVault } from "../../requests/design/drawn-design.js";

export interface AppJobs {
	jobsOf(app: string): readonly Job[];
	liveOf(app: string, id: string): LiveJob | null;
	stop(app: string, id: string): Promise<void>;
	watch(changed: () => void): () => void;
}

const DESIGN_POLL_MS = 1500;
const JOBS_REDRAW_MS = 400;

export function watchedJobs(jobs: AppJobs, changed: () => void): () => void {
	let soon: number | null = null;
	const stop = jobs.watch(() => {
		if (soon !== null) return;
		soon = window.setTimeout(() => {
			soon = null;
			changed();
		}, JOBS_REDRAW_MS);
	});
	return () => {
		if (soon !== null) window.clearTimeout(soon);
		stop();
	};
}

export function polledChanges(
	vault: DesignVault,
	app: string,
	drawn: () => DrawnDesign | undefined,
	changed: () => void,
): () => void {
	let seen = "";
	let isBusy = false;
	let isStopped = false;
	const poll = async (): Promise<void> => {
		if (isBusy) return;
		isBusy = true;
		const now = await changeStampOf(vault, app, drawn()).finally(() => (isBusy = false));
		if (isStopped) return;
		if (seen !== "" && now !== seen) changed();
		seen = now;
	};
	const timer = window.setInterval(() => void poll().catch(pollFailed), DESIGN_POLL_MS);
	return () => {
		isStopped = true;
		window.clearInterval(timer);
	};
}

function pollFailed(failure: unknown): void {
	console.error("[widgetarium] the design was not polled for changes", failure);
}

async function changeStampOf(vault: DesignVault, app: string, drawn: DrawnDesign | undefined): Promise<string> {
	const { adapter, registry } = vault;
	const stats = await Promise.all(
		[designPathOf(app), specPathOf(app), lookPathOf(app)].map((path) => adapter.stat(path).catch(() => null)),
	);
	const screens = drawn?.screens ?? [];
	const blocksNow = draftsOn(screens)
		.map((draft) => blocksOf(registry, draft).join(","))
		.join(";");
	const buildsNow = widgetsDrawnOn(registry, screens, drawn?.widgets ?? [])
		.map((id) => registry.get(id)?.buildKey ?? "")
		.join(",");
	return [...stats.map((stat) => String(stat?.mtime ?? "")), blocksNow, buildsNow].join("|");
}
