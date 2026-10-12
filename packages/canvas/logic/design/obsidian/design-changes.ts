import { lookPathOf } from "@widgetarium/core/app-look.js";
import { designPathOf } from "@widgetarium/core/app-design.js";
import { specPathOf } from "@widgetarium/core/app-spec.js";
import type { Job, LiveJob } from "../../../schemas/job.schema.js";
import type { DrawnDesign } from "../../../schemas/design.schema.js";
import { blocksOf } from "./design-block-registry.js";
import { draftsOn, widgetsDrawnOn } from "./vault-design.js";
import type { DesignVault } from "./vault-design.js";

export interface AppJobs {
	jobsOf(app: string): readonly Job[];
	liveOf(app: string, id: string): LiveJob | null;
	stop(app: string, id: string): Promise<void>;
	watch(changed: () => void): () => void;
}

const DESIGN_POLL_MS = 1500;
const JOBS_REDRAW_MS = 400;

export function watchedJobs(jobs: AppJobs | undefined, changed: () => void): () => void {
	let soon: number | null = null;
	const stop = jobs?.watch(() => {
		if (soon !== null) return;
		soon = window.setTimeout(() => {
			soon = null;
			changed();
		}, JOBS_REDRAW_MS);
	});
	return () => {
		if (soon !== null) window.clearTimeout(soon);
		stop?.();
	};
}

export function polledChanges(
	vault: DesignVault,
	app: string,
	drawn: () => DrawnDesign | undefined,
	changed: () => void,
): () => void {
	let seen = "";
	const poll = async (): Promise<void> => {
		const now = await changeStampOf(vault, app, drawn());
		if (seen !== "" && now !== seen) changed();
		seen = now;
	};
	const timer = window.setInterval(() => void poll(), DESIGN_POLL_MS);
	return () => window.clearInterval(timer);
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
