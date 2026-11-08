import { Tallies } from "./tallies.js";
import type { TallyRow } from "./tallies.js";

type EventCallback = (payload: unknown) => unknown;

interface CoreRequestRow {
	readonly name: string;
	readonly calls: number;
	readonly answerKb: number;
}

interface IpcReport {
	readonly ipcCalls: number;
	readonly ipcSentKb: number;
	readonly ipc: TallyRow[];
	readonly core: CoreRequestRow[];
	readonly heardEvents: number;
	readonly heard: TallyRow[];
}

const INTERNALS = "__TAURI_INTERNALS__";
const IPC_URL = "ipc://localhost/";
const EVENT_LISTEN = "plugin:event|listen";
const CORE_CALL = "plugin:studio-core|call";
const BYTES_PER_KB = 1024;

export class IpcCounts {
	private readonly calls = new Tallies();
	private readonly answerKbByCoreRequest = new Tallies();
	private readonly heard = new Tallies();
	private sentBytes = 0;
	private readonly eventOfCallback = new Map<number, string>();

	installCounters(page: Window): boolean {
		const callbacks = callbacksTableOf(page);
		if (callbacks === null) {
			return false;
		}

		this.interceptFetch(page);
		this.interceptCallbacks(callbacks);
		return true;
	}

	drain(rowLimit: number): IpcReport {
		const report = {
			ipcCalls: this.calls.totalCalls(),
			ipcSentKb: Math.round(this.sentBytes / 1024),
			ipc: this.calls.drain(rowLimit),
			core: this.answerKbByCoreRequest.drain(rowLimit).map(({ name, calls, ms }) => ({
				name,
				calls,
				answerKb: ms,
			})),
			heardEvents: this.heard.totalCalls(),
			heard: this.heard.drain(rowLimit),
		};
		this.sentBytes = 0;
		return report;
	}

	private interceptFetch(page: Window): void {
		const fetch = page.fetch.bind(page);
		page.fetch = (input, init) => {
			const command = ipcCommandOf(urlOf(input));
			if (command === null) {
				return fetch(input, init);
			}

			this.recordSent(command, init?.body);
			const answer = this.timed(command, fetch(input, init));
			this.recordCoreAnswer(command, init?.body, answer);
			return answer;
		};
	}

	private recordCoreAnswer(command: string, body: unknown, answer: Promise<Response>): void {
		const request = command === CORE_CALL && typeof body === "string" ? coreRequestNameOf(body) : null;

		if (request === null) {
			return;
		}

		void answer
			.then((response) => response.clone().text())
			.then((text) => this.answerKbByCoreRequest.add(request, text.length / BYTES_PER_KB))
			.catch(() => undefined);
	}

	private recordSent(command: string, body: unknown): void {
		if (typeof body !== "string") {
			return;
		}

		this.sentBytes += body.length;
		this.recordEventListener(command, body);
	}

	private timed(command: string, answer: Promise<Response>): Promise<Response> {
		const at = performance.now();
		const done = (): void => this.calls.add(command, performance.now() - at);
		answer.then(done, done);
		return answer;
	}

	private interceptCallbacks(callbacks: Map<unknown, unknown>): void {
		const get = callbacks.get.bind(callbacks);
		Reflect.set(callbacks, "get", (id: unknown): unknown => {
			const callback = get(id);
			const event = typeof id === "number" ? this.eventOfCallback.get(id) : undefined;
			if (event === undefined || !isEventCallback(callback)) {
				return callback;
			}

			return (payload: unknown) => this.callTimed(event, callback, payload);
		});
	}

	private recordEventListener(command: string, body: string): void {
		if (command !== EVENT_LISTEN) {
			return;
		}

		const args = parseJsonOrNull(body);
		if (typeof args !== "object" || args === null) {
			return;
		}

		const event: unknown = Reflect.get(args, "event");
		const handler: unknown = Reflect.get(args, "handler");
		if (typeof event === "string" && typeof handler === "number") {
			this.eventOfCallback.set(handler, event);
		}
	}

	private callTimed(event: string, callback: EventCallback, payload: unknown): unknown {
		const at = performance.now();
		try {
			return callback(payload);
		} finally {
			this.heard.add(event, performance.now() - at);
		}
	}
}

function callbacksTableOf(page: Window): Map<unknown, unknown> | null {
	const internals: unknown = Reflect.get(page, INTERNALS);
	if (typeof internals !== "object" || internals === null) {
		return null;
	}

	const callbacks: unknown = Reflect.get(internals, "callbacks");
	return callbacks instanceof Map ? callbacks : null;
}

function ipcCommandOf(url: string): string | null {
	if (!url.startsWith(IPC_URL)) {
		return null;
	}

	try {
		return decodeURIComponent(url.slice(IPC_URL.length));
	} catch {
		return url.slice(IPC_URL.length);
	}
}

function urlOf(input: RequestInfo | URL): string {
	if (typeof input === "string") {
		return input;
	}

	if (input instanceof URL) {
		return input.href;
	}

	return input.url;
}

function coreRequestNameOf(body: string): string | null {
	const asked = parseJsonOrNull(body);

	if (typeof asked !== "object" || asked === null) {
		return null;
	}

	const call: unknown = Reflect.get(asked, "call");
	const named: unknown = typeof call === "object" && call !== null ? Reflect.get(call, "name") : Reflect.get(asked, "name");
	return typeof named === "string" ? named : null;
}

function isEventCallback(value: unknown): value is EventCallback {
	return typeof value === "function";
}

function parseJsonOrNull(body: string): unknown {
	try {
		return JSON.parse(body);
	} catch {
		return null;
	}
}
