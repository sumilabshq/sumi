import { plainText } from "@widgetarium/core/engine/provider-stream.js";
import type { QuickAskLauncher } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantBridge, TurnEvent } from "./assistant-bridge.js";

const QUICK_ASK_MS = 60000;
const NO_QUICK_RUNNER = "{runner} has no runner plugin that answers quick asks.";
const QUICK_ASK_FAILED = "The quick ask to {runner} exited with code {code}. {said}";
const QUICK_ASK_TOO_LONG = "The quick ask to {runner} took longer than a minute, so it was stopped.";

export interface QuickAsk {
	readonly runner: string;
	readonly model: string | null;
	readonly prompt: string;
	readonly launcher: QuickAskLauncher | null;
}

export async function quickAnswerOf(bridge: AssistantBridge, ask: QuickAsk): Promise<string> {
	if (ask.launcher === null) {
		throw new Error(NO_QUICK_RUNNER.replace("{runner}", ask.runner));
	}

	const launch = ask.launcher({
		runner: ask.runner,
		model: ask.model,
		prompt: ask.prompt,
	});
	const heard: Record<"out" | "err", string[]> = {
		out: [],
		err: [],
	};
	let timer: ReturnType<typeof setTimeout> | undefined;
	const answered = new Promise<string>((resolve, reject) => {
		const started = bridge.startLaunch(launch, (event: TurnEvent) => {
			if (event.kind === "out" || event.kind === "err") {
				heard[event.kind].push(event.text);
				return;
			}

			if (event.code === 0) {
				resolve(plainText(heard.out.join("")).trim());
				return;
			}

			reject(new Error(failureOf(ask.runner, event.code, heard.err.join(""))));
		});
		started.catch(reject);
		timer = setTimeout(() => {
			void started.then((turnId) => bridge.stopTurn(turnId)).catch(() => undefined);
			reject(new Error(QUICK_ASK_TOO_LONG.replace("{runner}", ask.runner)));
		}, QUICK_ASK_MS);
	});
	return answered.finally(() => clearTimeout(timer));
}

function failureOf(runner: string, code: number | null, said: string): string {
	return QUICK_ASK_FAILED.replace("{runner}", runner)
		.replace("{code}", String(code))
		.replace("{said}", plainText(said).trim())
		.trim();
}
