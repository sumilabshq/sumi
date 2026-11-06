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
const NOT_OPENED = "[terminal] session {session}: no pty → no pty (the pty did not open)";
const NOT_RESIZED = "[terminal] session {session}: resize skipped (its shell has exited)";
const NOT_UNDERSTOOD = "[terminal] session {session}: the pty said something that is neither bytes nor an exit";

const PtyMessageSchema = z.union([
	z.array(z.number().int().min(0).max(255)),
	z.object({
		exit: z.number().nullable(),
	}),
]);

const PtyIdSchema = z.number();

const DoneSchema = z.null();

export class TauriTerminalSessionsGateway extends TerminalSessionsGateway {
	private readonly ptys = new Map<string, Promise<number>>();

	override async start(session: string, size: TerminalSize): Promise<void> {
		if (this.ptys.has(session)) {
			await this.resize(session, size);
			return;
		}

		await this.openPty(session, size);
	}

	override async resize(session: string, size: TerminalSize): Promise<void> {
		const pty = this.ptys.get(session);

		if (pty === undefined) {
			console.info(NOT_RESIZED.replace("{session}", session));
			return;
		}

		const resized = await invoke(RESIZE, {
			id: await pty,
			...size,
		});
		DoneSchema.parse(resized);
	}

	override async type(session: string, keys: string): Promise<void> {
		const written = await invoke(WRITE, {
			id: await this.ensurePty(session, UNMEASURED_SIZE),
			data: keys,
		});
		DoneSchema.parse(written);
	}

	override send(session: string, line: string): Promise<void> {
		return this.type(session, `${line}${ENTER}`);
	}

	private ensurePty(session: string, size: TerminalSize): Promise<number> {
		return this.ptys.get(session) ?? this.openPty(session, size);
	}

	private openPty(session: string, size: TerminalSize): Promise<number> {
		const opened = invoke(OPEN, {
			onData: this.ptyChannelOf(session),
			...size,
		}).then((id) => {
			this.recordStart(session);
			return PtyIdSchema.parse(id);
		});
		this.ptys.set(session, opened);
		opened.catch((failure: unknown) => {
			this.ptys.delete(session);
			console.error(NOT_OPENED.replace("{session}", session), failure);
		});
		return opened;
	}

	private ptyChannelOf(session: string): Channel<unknown> {
		const decoder = new TextDecoder();
		return new Channel<unknown>((message) => {
			const read = PtyMessageSchema.safeParse(message);

			if (!read.success) {
				console.error(NOT_UNDERSTOOD.replace("{session}", session), read.error);
				return;
			}

			if (Array.isArray(read.data)) {
				this.recordOutput(session, decoder.decode(new Uint8Array(read.data), { stream: true }));
				return;
			}

			this.ptys.delete(session);
			this.recordExit(session, read.data.exit);
		});
	}
}
