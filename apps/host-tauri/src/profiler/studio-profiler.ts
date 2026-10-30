import { CommitTimes } from "./commit-times.js";
import { DomChurn } from "./dom-churn.js";
import { FrameGaps } from "./frame-gaps.js";
import { IpcCounts } from "./ipc-counts.js";

const REPORT_EVERY_MS = 5000;
const TOP_ROWS = 8;
const PROFILE_SWITCH = "widgetarium-profile";
const SWITCHED_OFF = "0";
const REPORT_LINE = "[widgetarium] perf {report}";
const NOT_WRAPPED = "[widgetarium] perf: Tauri callbacks table not found, IPC is not counted";

export class StudioProfiler {
	readonly commits = new CommitTimes();
	private readonly ipc = new IpcCounts();
	private readonly frames = new FrameGaps();
	private readonly dom = new DomChurn();
	private readonly startedAt = performance.now();

	constructor(private readonly window: string) {}

	start(page: Window): void {
		if (!this.ipc.wrap(page)) {
			console.warn(NOT_WRAPPED);
		}

		this.frames.listen(page);
		this.dom.observe(page.document.documentElement);
		page.setInterval(() => this.report(), REPORT_EVERY_MS);
	}

	private report(): void {
		const frames = this.frames.drain();
		const report = {
			window: this.window,
			atS: Math.round((performance.now() - this.startedAt) / 1000),
			isIdle: frames.inputs === 0,
			frames,
			commits: this.commits.drain(),
			dom: this.dom.drain(),
			ipcCalls: this.ipc.calls.callsSoFar(),
			ipcSentKb: this.ipc.drainSentKb(),
			ipc: this.ipc.calls.drain(TOP_ROWS),
			heardEvents: this.ipc.heard.callsSoFar(),
			heard: this.ipc.heard.drain(TOP_ROWS),
		};
		console.info(REPORT_LINE.replace("{report}", JSON.stringify(report)));
	}
}

export function startStudioProfiler(page: Window, window: string): StudioProfiler | null {
	if (isProfilingSwitchedOff(page)) {
		return null;
	}

	const profiler = new StudioProfiler(window);
	profiler.start(page);
	return profiler;
}

function isProfilingSwitchedOff(page: Window): boolean {
	try {
		return page.localStorage.getItem(PROFILE_SWITCH) === SWITCHED_OFF;
	} catch {
		return false;
	}
}
