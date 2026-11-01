import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findBrowser } from "./harness.ts";

export type PageSize = readonly [number, number];

export interface PageAsk {
	readonly size: PageSize;
	readonly onGpu?: boolean;
	readonly hasFramesInProcess?: boolean;
	readonly hearsFailures?: boolean;
}

export type PagePoint = readonly [x: number, y: number];

export interface PointerPath {
	readonly from: PagePoint;
	readonly to: PagePoint;
	readonly steps: number;
	readonly stepMs: number;
}

export interface HeldDrag {
	readonly over: (at: PagePoint) => Promise<void>;
	readonly drop: (at: PagePoint) => Promise<void>;
	readonly releaseOutside: () => Promise<void>;
}

export interface AskedPage {
	readonly ask: (expression: string) => Promise<unknown>;
	readonly askInFrame: (frameUrlPart: string, expression: string) => Promise<unknown>;
	readonly lift: (path: PointerPath) => Promise<HeldDrag>;
	readonly press: (x: number, y: number) => Promise<void>;
	readonly hover: (x: number, y: number) => Promise<void>;
	readonly drag: (path: PointerPath) => Promise<void>;
	readonly release: (at: PagePoint) => Promise<unknown>;
	readonly reduceMotion: () => Promise<unknown>;
	readonly shoot: () => Promise<Buffer>;
	readonly typeText: (text: string) => Promise<void>;
	readonly pressEnter: () => Promise<void>;
	readonly failures: () => readonly string[];
	readonly close: () => void;
}

interface PageSocket {
	readonly close: () => void;
	readonly ask: (expression: string) => Promise<unknown>;
	readonly askInFrame: (frameUrlPart: string, expression: string) => Promise<unknown>;
	readonly lift: (path: PointerPath) => Promise<HeldDrag>;
	readonly press: (x: number, y: number) => Promise<void>;
	readonly hover: (x: number, y: number) => Promise<void>;
	readonly drag: (path: PointerPath) => Promise<void>;
	readonly release: (at: PagePoint) => Promise<unknown>;
	readonly reduceMotion: () => Promise<unknown>;
	readonly shoot: () => Promise<Buffer>;
	readonly typeText: (text: string) => Promise<void>;
	readonly pressEnter: () => Promise<void>;
	readonly failures: () => readonly string[];
	readonly viewportSetTo: (size: PageSize) => Promise<unknown>;
}

interface Waiting {
	readonly done: (message: unknown) => void;
	readonly fail: (error: Error) => void;
}

type Send = (method: string, params: Readonly<Record<string, unknown>>) => Promise<unknown>;

type Heard = (method: string, params: unknown) => void;

const OUTSIDE_X = -40;
const DROP_SETTLE_MS = 50;

export async function paged(file: string, gate: string, asked: PageAsk): Promise<AskedPage> {
	const browser = findBrowser(gate);
	const profile = mkdtempSync(path.join(tmpdir(), "wg-ask-profile-"));
	const chrome = spawned(browser, file, asked, profile);
	const socketUrl = await socketFor(profile);
	if (!socketUrl) {
		closeChrome(chrome, profile);
		throw new Error(`chrome never opened a page for ${file}`);
	}
	const socket = await talking(socketUrl, asked.hearsFailures === true);
	await socket.viewportSetTo(asked.size);
	return handled(socket, chrome, profile);
}

export function waited(ms: number): Promise<void> {
	return new Promise((done) => setTimeout(done, ms));
}

export async function waitUntil(check: () => Promise<boolean>, ms: number, stepMs: number): Promise<boolean> {
	for (let leftMs = ms; leftMs > 0; leftMs -= stepMs) {
		if (await check()) {
			return true;
		}

		await waited(stepMs);
	}

	return false;
}

function closeChrome(chrome: ChildProcess, profile: string): void {
	chrome.kill();
	rmSync(profile, {
		recursive: true,
		force: true,
		maxRetries: 3,
	});
}

function handled(socket: PageSocket, chrome: ChildProcess, profile: string): AskedPage {
	return {
		ask: socket.ask,
		askInFrame: socket.askInFrame,
		lift: socket.lift,
		press: socket.press,
		hover: socket.hover,
		drag: socket.drag,
		release: socket.release,
		reduceMotion: socket.reduceMotion,
		shoot: socket.shoot,
		typeText: socket.typeText,
		pressEnter: socket.pressEnter,
		failures: socket.failures,
		close: () => {
			socket.close();
			closeChrome(chrome, profile);
		},
	};
}

const GPU_FLAGS: readonly string[] = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];

const FRAMES_IN_PROCESS_FLAGS: readonly string[] = [
	"--disable-features=IsolateSandboxedIframes",
	"--disable-site-isolation-trials",
];

function spawned(
	browser: string,
	file: string,
	{ size, onGpu = false, hasFramesInProcess = false }: PageAsk,
	profile: string,
): ChildProcess {
	return spawn(
		browser,
		[
			"--headless=new",
			...(onGpu ? GPU_FLAGS : ["--disable-gpu"]),
			...(hasFramesInProcess ? FRAMES_IN_PROCESS_FLAGS : []),
			"--no-sandbox",
			"--hide-scrollbars",
			"--no-first-run",
			"--no-default-browser-check",
			`--window-size=${size[0]},${size[1]}`,
			"--remote-debugging-port=0",
			`--user-data-dir=${profile}`,
			/^https?:/.test(file) ? file : `file://${file}`,
		],
		{ stdio: ["ignore", "ignore", "ignore"] },
	);
}

async function socketFor(profile: string): Promise<string | null> {
	const port = await portFrom(profile);
	if (!port) return null;
	return targetIn(port);
}

async function portFrom(profile: string): Promise<number | null> {
	const at = path.join(profile, "DevToolsActivePort");
	for (let tries = 0; tries < 200; tries += 1) {
		await waited(50);
		if (existsSync(at)) return Number(readFileSync(at, "utf8").split("\n")[0]) || null;
	}
	return null;
}

async function targetIn(port: number): Promise<string | null> {
	for (let tries = 0; tries < 100; tries += 1) {
		const found = await targetNow(port);
		if (found) return found;
		await waited(50);
	}
	return null;
}

async function targetNow(port: number): Promise<string | null> {
	try {
		const list: unknown = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
		if (!Array.isArray(list)) return null;
		for (const entry of list) {
			const socketUrl = pageSocketOf(entry);
			if (socketUrl) return socketUrl;
		}
		return null;
	} catch {
		return null;
	}
}

function pageSocketOf(entry: unknown): string | null {
	if (typeof entry !== "object" || entry === null) return null;
	if (!("type" in entry) || entry.type !== "page") return null;
	if (!("webSocketDebuggerUrl" in entry) || typeof entry.webSocketDebuggerUrl !== "string") return null;
	return entry.webSocketDebuggerUrl || null;
}

async function talking(socketUrl: string, hearsFailures: boolean): Promise<PageSocket> {
	const socket = new WebSocket(socketUrl);
	await opening(socket);
	const failures: string[] = [];
	const send = sender(socket, (method, params) => {
		const failure = failureOf(method, params);

		if (failure !== null) {
			failures.push(failure);
		}
	});

	if (hearsFailures) {
		await send("Runtime.enable", {});
		await send("Log.enable", {});
	}

	return {
		close: () => socket.close(),
		ask: (expression) => answered(send, expression),
		askInFrame: (frameUrlPart, expression) => answeredInFrame(send, frameUrlPart, expression),
		lift: (path) => lifted(send, path),
		press: (x, y) => pressedAt(send, x, y),
		hover: async (x, y) => {
			await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
		},
		drag: (path) => draggedAlong(send, path),
		release: ([x, y]) =>
			send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }),
		reduceMotion: () =>
			send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }),
		shoot: async () =>
			Buffer.from(String(fieldOf(fieldOf(await send("Page.captureScreenshot", {}), "result"), "data")), "base64"),
		typeText: async (text) => {
			await send("Input.insertText", { text });
		},
		pressEnter: async () => {
			await send("Input.dispatchKeyEvent", ENTER_DOWN);
			await send("Input.dispatchKeyEvent", ENTER_UP);
		},
		failures: () => [...failures],
		viewportSetTo: ([width, height]) =>
			send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }),
	};
}

async function pressedAt(send: Send, x: number, y: number): Promise<void> {
	await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
	await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
	await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
}

async function draggedAlong(send: Send, { from, to, steps, stepMs }: PointerPath): Promise<void> {
	const [fromX, fromY] = from;
	await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: fromX, y: fromY });
	await send("Input.dispatchMouseEvent", { type: "mousePressed", x: fromX, y: fromY, button: "left", clickCount: 1 });
	for (let step = 1; step <= steps; step += 1) {
		await waited(stepMs);
		const x = fromX + ((to[0] - fromX) * step) / steps;
		const y = fromY + ((to[1] - fromY) * step) / steps;
		await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "left", buttons: 1 });
	}
}

class PointerHeldDrag {
	constructor(
		private readonly send: Send,
		private last: PagePoint,
	) {}

	async over(at: PagePoint): Promise<void> {
		this.last = at;
		await this.send("Input.dispatchMouseEvent", {
			type: "mouseMoved",
			x: at[0],
			y: at[1],
			button: "left",
			buttons: 1,
		});
	}

	async drop(at: PagePoint): Promise<void> {
		await this.over(at);
		await waited(DROP_SETTLE_MS);
		await this.send("Input.dispatchMouseEvent", {
			type: "mouseReleased",
			x: at[0],
			y: at[1],
			button: "left",
			clickCount: 1,
		});
	}

	releaseOutside(): Promise<void> {
		return this.drop([OUTSIDE_X, this.last[1]]);
	}
}

async function lifted(send: Send, path: PointerPath): Promise<HeldDrag> {
	await draggedAlong(send, path);
	const drag = new PointerHeldDrag(send, path.to);
	return {
		over: (point) => drag.over(point),
		drop: (point) => drag.drop(point),
		releaseOutside: () => drag.releaseOutside(),
	};
}

function opening(socket: WebSocket): Promise<unknown> {
	return new Promise((done, fail) => {
		socket.addEventListener("open", done, { once: true });
		socket.addEventListener("error", fail, { once: true });
	});
}

function sender(socket: WebSocket, heard: Heard): Send {
	const pending = new Map<unknown, Waiting>();
	let ticket = 0;
	pumping(socket, pending, heard);
	return (method, params) =>
		new Promise((done, fail) => {
			const id = (ticket += 1);
			pending.set(id, { done, fail });
			socket.send(JSON.stringify({ id, method, params }));
		});
}

function pumping(socket: WebSocket, pending: Map<unknown, Waiting>, heard: Heard): void {
	socket.addEventListener("message", (event: MessageEvent<unknown>) => {
		const message: unknown = JSON.parse(String(event.data));
		const method = fieldOf(message, "method");

		if (typeof method === "string") {
			heard(method, fieldOf(message, "params"));
			return;
		}

		const id = fieldOf(message, "id");
		pending.get(id)?.done(message);
		pending.delete(id);
	});
	const abandon = (): void => {
		for (const waiting of pending.values()) waiting.fail(new Error("chrome closed the socket before it answered"));
		pending.clear();
	};
	socket.addEventListener("close", abandon);
	socket.addEventListener("error", abandon);
}

const ENTER_DOWN = {
	type: "keyDown",
	key: "Enter",
	code: "Enter",
	windowsVirtualKeyCode: 13,
	text: "\r",
};

const ENTER_UP = {
	type: "keyUp",
	key: "Enter",
	code: "Enter",
	windowsVirtualKeyCode: 13,
};

function failureOf(method: string, params: unknown): string | null {
	if (method === "Runtime.exceptionThrown") {
		const details = fieldOf(params, "exceptionDetails");
		return `exception: ${String(fieldOf(fieldOf(details, "exception"), "description") ?? fieldOf(details, "text"))} at ${String(fieldOf(details, "url"))}`;
	}

	if (method === "Runtime.consoleAPICalled" && fieldOf(params, "type") === "error") {
		const args = fieldOf(params, "args");
		const said = Array.isArray(args)
			? args.map((arg: unknown) => String(fieldOf(arg, "value") ?? fieldOf(arg, "description")))
			: [];
		const frames = fieldOf(fieldOf(params, "stackTrace"), "callFrames");
		const at = Array.isArray(frames) ? String(fieldOf(frames[0], "url") ?? "") : "";
		return `console.error: ${said.join(" ")} at ${at}`;
	}

	const entry = fieldOf(params, "entry");

	if (method === "Log.entryAdded" && fieldOf(entry, "level") === "error") {
		return `log ${String(fieldOf(entry, "source"))}: ${String(fieldOf(entry, "text"))} ${String(fieldOf(entry, "url") ?? "")}`;
	}

	return null;
}

function fieldOf(value: unknown, name: string): unknown {
	if (typeof value !== "object" || value === null || !(name in value)) return undefined;
	return Reflect.get(value, name);
}

async function answered(send: Send, expression: string, contextId?: number): Promise<unknown> {
	const reply = await send("Runtime.evaluate", {
		expression,
		returnByValue: true,
		awaitPromise: true,
		...(contextId === undefined ? {} : { contextId }),
	});
	const result = fieldOf(reply, "result");
	const exceptionDetails = fieldOf(result, "exceptionDetails");
	if (exceptionDetails)
		throw new Error(`the page threw: ${JSON.stringify(fieldOf(exceptionDetails, "exception") ?? exceptionDetails)}`);
	return fieldOf(fieldOf(result, "result"), "value");
}

async function answeredInFrame(send: Send, frameUrlPart: string, expression: string): Promise<unknown> {
	const tree = fieldOf(fieldOf(await send("Page.getFrameTree", {}), "result"), "frameTree");
	const frameId = frameIdIn(tree, frameUrlPart);

	if (frameId === null) {
		return undefined;
	}

	const world = await send("Page.createIsolatedWorld", { frameId, worldName: "chrome-ask" });
	const contextId = fieldOf(fieldOf(world, "result"), "executionContextId");

	if (typeof contextId !== "number") {
		throw new Error(`chrome gave frame ${frameUrlPart} no context: ${JSON.stringify(world)}`);
	}

	return answered(send, expression, contextId);
}

function frameIdIn(tree: unknown, frameUrlPart: string): string | null {
	const frame = fieldOf(tree, "frame");
	const url = fieldOf(frame, "url");
	const id = fieldOf(frame, "id");

	if (typeof url === "string" && url.includes(frameUrlPart) && typeof id === "string") {
		return id;
	}

	const children = fieldOf(tree, "childFrames");

	if (!Array.isArray(children)) {
		return null;
	}

	for (const child of children) {
		const found = frameIdIn(child, frameUrlPart);

		if (found !== null) {
			return found;
		}
	}

	return null;
}
