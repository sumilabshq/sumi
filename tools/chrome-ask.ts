import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findBrowser } from "./harness.ts";

export type PageSize = readonly [number, number];

export interface PageAsk {
	readonly size: PageSize;
	readonly onGpu?: boolean;
}

export type PagePoint = readonly [x: number, y: number];

export interface PointerPath {
	readonly from: PagePoint;
	readonly to: PagePoint;
	readonly steps: number;
	readonly stepMs: number;
}

export interface NativeDrag {
	readonly isLifted: boolean;
	readonly over: (at: PagePoint) => Promise<void>;
	readonly drop: (at: PagePoint) => Promise<void>;
	readonly releaseOutside: () => Promise<void>;
}

export interface AskedPage {
	readonly ask: (expression: string) => Promise<unknown>;
	readonly lift: (path: PointerPath) => Promise<NativeDrag>;
	readonly press: (x: number, y: number) => Promise<void>;
	readonly hover: (x: number, y: number) => Promise<void>;
	readonly drag: (path: PointerPath) => Promise<void>;
	readonly release: (at: PagePoint) => Promise<unknown>;
	readonly reduceMotion: () => Promise<unknown>;
	readonly shoot: () => Promise<Buffer>;
	readonly close: () => void;
}

interface PageSocket {
	readonly close: () => void;
	readonly ask: (expression: string) => Promise<unknown>;
	readonly lift: (path: PointerPath) => Promise<NativeDrag>;
	readonly press: (x: number, y: number) => Promise<void>;
	readonly hover: (x: number, y: number) => Promise<void>;
	readonly drag: (path: PointerPath) => Promise<void>;
	readonly release: (at: PagePoint) => Promise<unknown>;
	readonly reduceMotion: () => Promise<unknown>;
	readonly shoot: () => Promise<Buffer>;
	readonly viewportSetTo: (size: PageSize) => Promise<unknown>;
}

interface Waiting {
	readonly done: (message: unknown) => void;
	readonly fail: (error: Error) => void;
}

type Send = (method: string, params: Readonly<Record<string, unknown>>) => Promise<unknown>;

type Heard = (method: string, params: unknown) => void;

const DRAG_INTERCEPTED = "Input.dragIntercepted";
const LIFT_STEPS = 6;
const LIFT_STEP_PX = 2;
const LIFT_WAIT_MS = 1000;
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
	const socket = await talking(socketUrl);
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
		lift: socket.lift,
		press: socket.press,
		hover: socket.hover,
		drag: socket.drag,
		release: socket.release,
		reduceMotion: socket.reduceMotion,
		shoot: socket.shoot,
		close: () => {
			socket.close();
			closeChrome(chrome, profile);
		},
	};
}

const GPU_FLAGS: readonly string[] = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];

function spawned(browser: string, file: string, { size, onGpu = false }: PageAsk, profile: string): ChildProcess {
	return spawn(
		browser,
		[
			"--headless=new",
			...(onGpu ? GPU_FLAGS : ["--disable-gpu"]),
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

async function talking(socketUrl: string): Promise<PageSocket> {
	const socket = new WebSocket(socketUrl);
	await opening(socket);
	const heard = new Set<Heard>();
	const send = sender(socket, heard);
	return {
		close: () => socket.close(),
		ask: (expression) => answered(send, expression),
		lift: (path) => lifted(send, heard, path),
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

const NOT_LIFTED: NativeDrag = {
	isLifted: false,
	over: async () => undefined,
	drop: async () => undefined,
	releaseOutside: async () => undefined,
};

class InterceptedDrag {
	private last: PagePoint;

	constructor(
		private readonly send: Send,
		private readonly data: unknown,
		from: PagePoint,
	) {
		this.last = from;
	}

	async move(type: string, at: PagePoint): Promise<void> {
		this.last = at;
		await this.send("Input.dispatchDragEvent", { type, x: at[0], y: at[1], data: this.data, modifiers: 0 });
	}

	async drop(at: PagePoint): Promise<void> {
		await this.move("dragOver", at);
		await waited(DROP_SETTLE_MS);
		await this.move("drop", at);
		await this.end();
	}

	releaseOutside(): Promise<void> {
		return this.drop([OUTSIDE_X, this.last[1]]);
	}

	async end(): Promise<void> {
		const [x, y] = this.last;
		await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
		await this.send("Input.setInterceptDrags", { enabled: false });
	}
}

async function pressedUntilLifted(send: Send, heard: Set<Heard>, [x, y]: PagePoint): Promise<unknown> {
	const intercepted = interceptedDrag(heard);
	await send("Input.setInterceptDrags", { enabled: true });
	await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
	await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });

	for (let step = 1; step <= LIFT_STEPS; step += 1) {
		await send("Input.dispatchMouseEvent", {
			type: "mouseMoved",
			x,
			y: y + step * LIFT_STEP_PX,
			button: "left",
			buttons: 1,
		});
	}

	return intercepted;
}

async function lifted(send: Send, heard: Set<Heard>, path: PointerPath): Promise<NativeDrag> {
	const data = await pressedUntilLifted(send, heard, path.from);
	const drag = new InterceptedDrag(send, data, path.from);

	if (data === null) {
		await drag.end();
		return NOT_LIFTED;
	}

	await drag.move("dragEnter", path.from);
	await draggedOver(path, (point) => drag.move("dragOver", point));
	return {
		isLifted: true,
		over: (point) => drag.move("dragOver", point),
		drop: (point) => drag.drop(point),
		releaseOutside: () => drag.releaseOutside(),
	};
}

function interceptedDrag(heard: Set<Heard>): Promise<unknown> {
	return new Promise((done) => {
		const timer = setTimeout(() => finish(null), LIFT_WAIT_MS);
		const hear: Heard = (method, params) => {
			if (method === DRAG_INTERCEPTED) {
				finish(fieldOf(params, "data") ?? null);
			}
		};
		const finish = (data: unknown): void => {
			clearTimeout(timer);
			heard.delete(hear);
			done(data);
		};
		heard.add(hear);
	});
}

async function draggedOver(
	{ from, to, steps, stepMs }: PointerPath,
	over: (at: PagePoint) => Promise<void>,
): Promise<void> {
	for (let step = 1; step <= steps; step += 1) {
		await waited(stepMs);
		await over([from[0] + ((to[0] - from[0]) * step) / steps, from[1] + ((to[1] - from[1]) * step) / steps]);
	}
}

function opening(socket: WebSocket): Promise<unknown> {
	return new Promise((done, fail) => {
		socket.addEventListener("open", done, { once: true });
		socket.addEventListener("error", fail, { once: true });
	});
}

function sender(socket: WebSocket, heard: ReadonlySet<Heard>): Send {
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

function pumping(socket: WebSocket, pending: Map<unknown, Waiting>, heard: ReadonlySet<Heard>): void {
	socket.addEventListener("message", (event: MessageEvent<unknown>) => {
		const message: unknown = JSON.parse(String(event.data));
		const method = fieldOf(message, "method");

		if (typeof method === "string") {
			heard.forEach((hear) => hear(method, fieldOf(message, "params")));
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

function fieldOf(value: unknown, name: string): unknown {
	if (typeof value !== "object" || value === null || !(name in value)) return undefined;
	return Reflect.get(value, name);
}

async function answered(send: Send, expression: string): Promise<unknown> {
	const reply = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
	const result = fieldOf(reply, "result");
	const exceptionDetails = fieldOf(result, "exceptionDetails");
	if (exceptionDetails)
		throw new Error(`the page threw: ${JSON.stringify(fieldOf(exceptionDetails, "exception") ?? exceptionDetails)}`);
	return fieldOf(fieldOf(result, "result"), "value");
}
