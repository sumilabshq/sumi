import { Profiler, createElement as h } from "react";
import type { ReactElement } from "react";
import { STUDIO_MARK } from "../studio-log.js";
import { CommitTimes } from "./commit-times.js";
import { DomChurn } from "./dom-churn.js";
import { FrameGaps } from "./frame-gaps.js";
import { IpcCounts } from "./ipc-counts.js";

const REPORT_EVERY_MS = 5000;
const REPORT_ROWS_LIMIT = 8;
const PROFILE_FLAG_KEY = "widgetarium-profile";
const PROFILE_OFF_VALUE = "0";
const CALLBACKS_TABLE_MISSING = `${STUDIO_MARK} perf: Tauri callbacks table not found, IPC is not counted`;

class StudioProfiler {
	readonly commits = new CommitTimes();
	private readonly ipc = new IpcCounts();
	private readonly frames = new FrameGaps();
	private readonly dom = new DomChurn();
	private readonly startedAt = performance.now();

	constructor(private readonly windowLabel: string) {}

	start(page: Window): void {
		if (!this.ipc.installCounters(page)) {
			console.warn(CALLBACKS_TABLE_MISSING);
		}

		this.frames.listen(page);
		this.dom.observe(page.document.documentElement);
		page.setInterval(() => this.report(), REPORT_EVERY_MS);
	}

	private report(): void {
		const frames = this.frames.drain();
		const report = {
			window: this.windowLabel,
			uptimeSeconds: Math.round((performance.now() - this.startedAt) / 1000),
			isIdle: frames.inputs === 0,
			frames,
			commits: this.commits.drain(),
			dom: this.dom.drain(),
			...this.ipc.drain(REPORT_ROWS_LIMIT),
		};
		console.info(`${STUDIO_MARK} perf ${JSON.stringify(report)}`);
	}
}

export function startStudioProfiler(page: Window, windowLabel: string): StudioProfiler | null {
	if (isProfilingSwitchedOff(page)) {
		return null;
	}

	const profiler = new StudioProfiler(windowLabel);
	profiler.start(page);
	return profiler;
}

export function profiledRoot(profiler: StudioProfiler | null, root: ReactElement): ReactElement {
	if (profiler === null) {
		return root;
	}

	return h(Profiler, { id: "studio", onRender: profiler.commits.onRender }, root);
}

function isProfilingSwitchedOff(page: Window): boolean {
	try {
		return page.localStorage.getItem(PROFILE_FLAG_KEY) === PROFILE_OFF_VALUE;
	} catch {
		return false;
	}
}
