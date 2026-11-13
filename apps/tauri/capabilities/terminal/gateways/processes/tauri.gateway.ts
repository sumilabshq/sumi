import { Channel, invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import type { StartProcessInput } from "../../shared/schema/terminal.schema.js";
import { ProcessesGateway } from "./processes.gateway.js";

const SPAWN = "plugin:terminal|spawn";
const STOP = "plugin:terminal|stop";
const LINE_END = /\r?\n$/;
const NOT_STOPPED = "[terminal] process {run}: stop skipped (it is not running here)";
const NOT_UNDERSTOOD = "[terminal] process {run}: the host said something that is neither a line nor an exit";

const ProcessEventSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("out"),
		text: z.string(),
	}),
	z.object({
		kind: z.literal("err"),
		text: z.string(),
	}),
	z.object({
		kind: z.literal("exited"),
		code: z.number().nullable(),
	}),
]);

const ProcessIdSchema = z.number();

export class TauriProcessesGateway extends ProcessesGateway {
	private readonly ids = new Map<string, number>();

	override async start(run: string, { folder, program, args, env }: StartProcessInput): Promise<void> {
		const id = await invoke(SPAWN, {
			onData: this.channelOf(run),
			folder,
			program,
			args,
			env: env ?? {},
		});
		this.ids.set(run, ProcessIdSchema.parse(id));
		this.recordStart(run);
	}

	override async stop(run: string): Promise<void> {
		const id = this.ids.get(run);

		if (id === undefined) {
			console.info(NOT_STOPPED.replace("{run}", run));
			return;
		}

		await invoke(STOP, { id });
	}

	private channelOf(run: string): Channel<unknown> {
		return new Channel<unknown>((message) => {
			const heard = ProcessEventSchema.safeParse(message);

			if (!heard.success) {
				console.error(NOT_UNDERSTOOD.replace("{run}", run), heard.error);
				return;
			}

			if (heard.data.kind === "exited") {
				this.ids.delete(run);
				this.recordExit(run, heard.data.code);
				return;
			}

			this.recordLine(run, {
				stream: heard.data.kind,
				text: heard.data.text.replace(LINE_END, ""),
			});
		});
	}
}
