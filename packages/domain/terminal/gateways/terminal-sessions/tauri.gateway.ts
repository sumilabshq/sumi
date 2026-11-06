import { Channel, invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import type { TerminalSize } from "../../shared/schema/terminal.schema.js";
import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

const OPEN = "plugin:terminal|open";
const WRITE = "plugin:terminal|write";
const RESIZE = "plugin:terminal|resize";
const UNMEASURED_SIZE: TerminalSize = {
	cols: 120,
	rows: 40,
};
const ENTER = "\r";
const NOT_OPENED = "[terminal] app {app}: no session → no session (the pty did not open)";
const NOT_RESIZED = "[terminal] app {app}: resize skipped (no session yet; the next start opens at the screen's size)";
const NOT_UNDERSTOOD = "[terminal] app {app}: the pty said something that is neither bytes nor an exit";

const PtyMessageSchema = z.union([
	z.array(z.number().int().min(0).max(255)),
	z.object({
		exit: z.number().nullable(),
	}),
]);

const SessionIdSchema = z.number();

const DoneSchema = z.null();

export class TauriTerminalSessionsGateway extends TerminalSessionsGateway {
	private readonly sessions = new Map<string, Promise<number>>();

	override async start(app: string, size: TerminalSize): Promise<void> {
		if (this.sessions.has(app)) {
			await this.resize(app, size);
			return;
		}

		await this.openSession(app, size);
	}

	override async resize(app: string, size: TerminalSize): Promise<void> {
		const session = this.sessions.get(app);

		if (session === undefined) {
			console.info(NOT_RESIZED.replace("{app}", app));
			return;
		}

		const resized = await invoke(RESIZE, {
			id: await session,
			...size,
		});
		DoneSchema.parse(resized);
	}

	override async type(app: string, keys: string): Promise<void> {
		const written = await invoke(WRITE, {
			id: await this.ensureSession(app, UNMEASURED_SIZE),
			data: keys,
		});
		DoneSchema.parse(written);
	}

	override send(app: string, line: string): Promise<void> {
		return this.type(app, `${line}${ENTER}`);
	}

	private ensureSession(app: string, size: TerminalSize): Promise<number> {
		return this.sessions.get(app) ?? this.openSession(app, size);
	}

	private openSession(app: string, size: TerminalSize): Promise<number> {
		const opened = invoke(OPEN, {
			onData: this.ptyChannelOf(app),
			...size,
		}).then((id) => {
			this.recordStart(app);
			return SessionIdSchema.parse(id);
		});
		this.sessions.set(app, opened);
		opened.catch((failure: unknown) => {
			this.sessions.delete(app);
			console.error(NOT_OPENED.replace("{app}", app), failure);
		});
		return opened;
	}

	private ptyChannelOf(app: string): Channel<unknown> {
		const decoder = new TextDecoder();
		return new Channel<unknown>((message) => {
			const read = PtyMessageSchema.safeParse(message);

			if (!read.success) {
				console.error(NOT_UNDERSTOOD.replace("{app}", app), read.error);
				return;
			}

			if (Array.isArray(read.data)) {
				this.recordOutput(app, decoder.decode(new Uint8Array(read.data), { stream: true }));
				return;
			}

			this.sessions.delete(app);
			this.recordExit(app, read.data.exit);
		});
	}
}
