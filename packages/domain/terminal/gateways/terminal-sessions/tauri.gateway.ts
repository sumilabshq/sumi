import { Channel, invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

const OPEN = "plugin:terminal|open";
const WRITE = "plugin:terminal|write";
const COLUMNS = 120;
const ROWS = 40;
const ENTER = "\r";
const NOT_OPENED = "[terminal] app {app}: no session → no session (the pty did not open)";
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

	override async send(app: string, line: string): Promise<void> {
		const id = await (this.sessions.get(app) ?? this.openSession(app));
		const written = await invoke(WRITE, {
			id,
			data: `${line}${ENTER}`,
		});
		DoneSchema.parse(written);
	}

	private openSession(app: string): Promise<number> {
		const opened = invoke(OPEN, {
			onData: this.ptyChannelOf(app),
			cols: COLUMNS,
			rows: ROWS,
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
