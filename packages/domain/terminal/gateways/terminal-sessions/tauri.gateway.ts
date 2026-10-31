import { Channel, invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import { TerminalSessionsGateway } from "./terminal-sessions.gateway.js";

const OPEN = "plugin:terminal|open";
const WRITE = "plugin:terminal|write";
const COLUMNS = 120;
const ROWS = 40;
const ENTER = "\r";
const NOT_UNDERSTOOD = "[terminal] app {app}: the pty said something that is neither bytes nor an exit";

const PtyMessageSchema = z.union([
	z.array(z.number().int().min(0).max(255)),
	z.object({
		exit: z.number().nullable(),
	}),
]);

const SessionIdSchema = z.number();

export class TauriTerminalSessionsGateway extends TerminalSessionsGateway {
	private readonly sessions = new Map<string, Promise<number>>();

	override async send(app: string, line: string): Promise<void> {
		const id = await (this.sessions.get(app) ?? this.openSession(app));
		await invoke(WRITE, {
			id,
			data: `${line}${ENTER}`,
		});
	}

	private openSession(app: string): Promise<number> {
		const opened = invoke(OPEN, {
			onData: this.ptyChannelOf(app),
			cols: COLUMNS,
			rows: ROWS,
		}).then((id) => SessionIdSchema.parse(id));
		this.sessions.set(app, opened);
		this.heardStart(app);
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
				this.heardOutput(app, decoder.decode(new Uint8Array(read.data), { stream: true }));
				return;
			}

			this.sessions.delete(app);
			this.heardExit(app, read.data.exit);
		});
	}
}
