import { Tallies } from "./tallies.js";

type Heard = (payload: unknown) => void;

const INTERNALS = "__TAURI_INTERNALS__";
const IPC_URL = "ipc://localhost/";
const EVENT_LISTEN = "plugin:event|listen";

export class IpcCounts {
	readonly calls = new Tallies();
	readonly heard = new Tallies();
	private sentBytes = 0;
	private readonly eventOfCallback = new Map<number, string>();

	wrap(page: Window): boolean {
		const callbacks: unknown = Reflect.get(Reflect.get(page, INTERNALS) ?? {}, "callbacks");
		if (!(callbacks instanceof Map)) {
			return false;
		}

		this.countCalls(page);
		this.countHeard(callbacks);
		return true;
	}

	drainSentKb(): number {
		const kb = Math.round(this.sentBytes / 1024);
		this.sentBytes = 0;
		return kb;
	}

	private countCalls(page: Window): void {
		const fetch = page.fetch.bind(page);
		page.fetch = (input, init) => {
			const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
			if (!url.startsWith(IPC_URL)) {
				return fetch(input, init);
			}

			const command = decodeURIComponent(url.slice(IPC_URL.length));
			const body = init?.body;
			if (typeof body === "string") {
				this.sentBytes += body.length;
				this.rememberListen(command, body);
			}

			const at = performance.now();
			const answer = fetch(input, init);
			const done = (): void => this.calls.add(command, performance.now() - at);
			answer.then(done, done);
			return answer;
		};
	}

	private countHeard(callbacks: Map<unknown, unknown>): void {
		const get = callbacks.get.bind(callbacks);
		Reflect.set(callbacks, "get", (id: unknown): unknown => {
			const callback = get(id);
			const event = typeof id === "number" ? this.eventOfCallback.get(id) : undefined;
			if (event === undefined || !isHeard(callback)) {
				return callback;
			}

			return (payload: unknown) => this.hear(event, callback, payload);
		});
	}

	private rememberListen(command: string, body: string): void {
		if (command !== EVENT_LISTEN) {
			return;
		}

		const args = parsedOrNull(body);
		const event: unknown = typeof args === "object" && args !== null ? Reflect.get(args, "event") : undefined;
		const handler: unknown = typeof args === "object" && args !== null ? Reflect.get(args, "handler") : undefined;
		if (typeof event === "string" && typeof handler === "number") {
			this.eventOfCallback.set(handler, event);
		}
	}

	private hear(event: string, callback: Heard, payload: unknown): void {
		const at = performance.now();
		try {
			callback(payload);
		} finally {
			this.heard.add(event, performance.now() - at);
		}
	}
}

function isHeard(value: unknown): value is Heard {
	return typeof value === "function";
}

function parsedOrNull(body: string): unknown {
	try {
		return JSON.parse(body);
	} catch {
		return null;
	}
}
