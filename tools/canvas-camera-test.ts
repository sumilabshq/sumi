import { JSDOM } from "jsdom";
import type { ViewStateResult } from "obsidian";
import { JobSchema } from "../packages/shared/core/src/app-jobs.ts";
import type { Job } from "../packages/shared/core/src/app-jobs.ts";
import { constructAsUntypedSource, callAsUntypedSource } from "./untyped-source.ts";
import { PROBE_VIEW } from "./vault-fixture.ts";

const dom = new JSDOM(`<!doctype html><body></body>`, { pretendToBeVisual: true });
const resized = new Set<() => void>();
class WatchedSize {
	constructor(readonly answer: () => void) {
		resized.add(answer);
	}
	observe(): void {}
	disconnect(): void {
		resized.delete(this.answer);
	}
}
class NeverSeen {
	observe(): void {}
	disconnect(): void {}
}
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	MouseEvent: dom.window.MouseEvent,
	KeyboardEvent: dom.window.KeyboardEvent,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
	CSS: { escape: (said: string) => said.replace(/["\\]/g, "\\$&") },
	ResizeObserver: WatchedSize,
	IntersectionObserver: NeverSeen,
});
Object.assign(dom.window, {
	ResizeObserver: WatchedSize,
	IntersectionObserver: NeverSeen,
	matchMedia: () => ({ matches: false }),
	requestIdleCallback: (run: () => void) => dom.window.setTimeout(run, 0),
});

const layerSize = { width: 3000, height: 1500 };
const FIELD_SIZE = { width: 1600, height: 1000 };
const isLayer = (element: Element): boolean => element.hasAttribute("data-canvas-layer");
const sizeOf = (element: Element): { width: number; height: number } | null =>
	isLayer(element) ? layerSize : element.hasAttribute("data-canvas-field") ? FIELD_SIZE : null;
Object.defineProperties(dom.window.HTMLElement.prototype, {
	offsetWidth: {
		get: function (this: HTMLElement) {
			return sizeOf(this)?.width ?? 0;
		},
	},
	offsetHeight: {
		get: function (this: HTMLElement) {
			return sizeOf(this)?.height ?? 0;
		},
	},
	createDiv: {
		value: function (this: HTMLElement, options: { cls?: string } = {}) {
			const made = dom.window.document.createElement("div");
			if (options.cls) made.className = options.cls;
			this.append(made);
			return made;
		},
	},
	addClass: {
		value: function (this: HTMLElement, cls: string) {
			this.classList.add(cls);
		},
	},
});

const { ItemView } = await import("obsidian");
Object.assign(ItemView.prototype, { setState: async () => undefined });
const { DesignView } = await import("../apps/host-obsidian/src/legacy/design-view.ts");
const { answerShotRequests, SHOTS_DIR, SHOT_REQUESTS_DIR } =
	await import("../apps/host-obsidian/src/legacy/shot-requests.ts");
const { designPathOf } = await import("../packages/shared/core/src/app-design.ts");
const { WidgetRegistry } = await import("../packages/shared/core/src/registry.js");

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const APP = "Demo";
const files = new Map<string, string>();
const designWith = (urls: readonly string[]): string =>
	JSON.stringify({ screens: [], references: urls.map((url) => ({ url, why: "the layout to copy" })) });
files.set(designPathOf(APP), designWith(["https://x.test/a.png"]));
const adapter = {
	read: async (path: string): Promise<string> => {
		const text = files.get(path);
		if (text === undefined) throw new Error(`no file ${path}`);
		return text;
	},
	exists: async (path: string): Promise<boolean> =>
		[...files.keys()].some((one) => one === path || one.startsWith(`${path}/`)),
	list: async (path: string) => ({ files: [...files.keys()].filter((one) => one.startsWith(`${path}/`)), folders: [] }),
	remove: async (path: string): Promise<void> => void files.delete(path),
	write: async (path: string, text: string): Promise<void> => void files.set(path, text),
	writeBinary: async (path: string): Promise<void> => void files.set(path, "png"),
	process: async (path: string, change: (text: string) => string): Promise<string> => {
		const text = change(files.get(path) ?? "");
		files.set(path, text);
		return text;
	},
	stat: async () => null,
	getResourcePath: (path: string) => path,
};

const jobOf = (page: string, phase: Job["phase"]): Job =>
	JobSchema.parse({
		id: `${page.toLowerCase()}-${phase}`,
		app: APP,
		title: `${phase} ${page}`,
		page,
		phase,
		says: `Work on ${page}.`,
		status: "running",
		createdAt: 1,
	});
let jobs: Job[] = [jobOf("Closed", "design"), jobOf("Open", "review")];
const jobWatchers = new Set<() => void>();
const intervals: number[] = [];
const workspace = { requestSaveLayout: () => undefined, getActiveViewOfType: () => null };
const pluginApp = { vault: { adapter }, workspace };
const plugin = {
	app: pluginApp,
	registry: new WidgetRegistry({ vault: { adapter } }),
	host: { ...PROBE_VIEW, slot: () => null, here: null },
	started: Promise.resolve(),
	assistant: {
		jobs: {
			jobsOf: (): Job[] => jobs,
			watch: (onChange: () => void): (() => void) => {
				jobWatchers.add(onChange);
				return () => void jobWatchers.delete(onChange);
			},
			liveOf: (): null => null,
			stop: async (): Promise<void> => undefined,
		},
	},
	registerInterval: (id: number) => void intervals.push(id),
};
const leaf = { updateHeader: () => undefined };
const contentEl = dom.window.document.body.createDiv({ cls: "workspace-leaf-content" });
Object.defineProperties(contentEl, { clientWidth: { value: 1600 }, clientHeight: { value: 1000 } });
const view = constructAsUntypedSource(DesignView, leaf, plugin);
Object.assign(view, {
	app: pluginApp,
	contentEl,
	register: () => undefined,
	registerInterval: (id: number) => void intervals.push(id),
	registerDomEvent: () => undefined,
});

const pause = (ms: number): Promise<void> => new Promise((done) => dom.window.setTimeout(done, ms));
const layerOf = (): HTMLElement | null => contentEl.querySelector<HTMLElement>("[data-canvas-layer]");
const resizeAll = (): void => {
	for (const answer of [...resized]) answer();
};
const personSees = () => ({
	page: view.getState()["page"],
	shown: Reflect.get(view, "shownPage"),
	camera: layerOf()?.style.transform ?? null,
});

await view.onOpen();
await view.setState({ app: APP, page: "Closed" }, standInResult());
await pause(100);
resizeAll();
await pause(1800);
const before = personSees();
check(
	"the person stands on the page they opened, with a camera laid",
	[before.page, Boolean(before.camera)],
	["Closed", true],
);

files.set(designPathOf(APP), designWith(["https://x.test/a.png", "https://x.test/b.png", "https://x.test/c.png"]));
layerSize.width = 7000;
layerSize.height = 4200;
resizeAll();
await pause(200);
check("the agent writing the design does not move the person's camera", personSees(), before);

jobs = [{ ...jobOf("Closed", "design"), status: "done" }, jobOf("Open", "review")];
for (const told of jobWatchers) told();
await pause(700);
check("the agent's job ending does not turn the person's page", personSees(), before);

callAsUntypedSource(answerShotRequests, plugin);
files.set(`${SHOT_REQUESTS_DIR}/agent.json`, JSON.stringify({ design: APP }));
let shotRefusal = "";
for (let tries = 0; tries < 40 && !shotRefusal; tries += 1) {
	await pause(100);
	shotRefusal = files.get(`${SHOTS_DIR}/agent.failed.txt`) ?? "";
}
check(
	"a design shot is refused with why, never drawn as a picture",
	[
		shotRefusal.includes("draws only on the GPU"),
		files.has(`${SHOTS_DIR}/agent.png`),
		files.has(`${SHOT_REQUESTS_DIR}/agent.json`),
	],
	[true, false, false],
);
check("the refused shot does not move the person's camera or page", personSees(), before);

const writeAnswer = adapter.write;
adapter.write = async (path: string, text: string): Promise<void> => {
	if (path.endsWith("blocked.failed.txt")) throw new Error("the disk is full");
	await writeAnswer(path, text);
};
files.set(`${SHOT_REQUESTS_DIR}/blocked.json`, "{");
files.set(`${SHOT_REQUESTS_DIR}/broken.json`, "{");
for (let tries = 0; tries < 40 && !files.has(`${SHOTS_DIR}/broken.failed.txt`); tries += 1) await pause(100);
check(
	"a request that cannot be parsed is answered with why, and only then removed; one whose answer cannot be written stays and blocks no other",
	[
		(files.get(`${SHOTS_DIR}/broken.failed.txt`) ?? "").length > 0,
		files.has(`${SHOT_REQUESTS_DIR}/broken.json`),
		files.has(`${SHOT_REQUESTS_DIR}/blocked.json`),
	],
	[true, false, true],
);
adapter.write = writeAnswer;

for (const id of intervals) dom.window.clearInterval(id);
await view.onClose();
console.log(`\n${failed === 0 ? "canvas camera: clean" : `canvas camera: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);

function standInResult(): ViewStateResult {
	return { history: false };
}
