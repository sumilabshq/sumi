import type { AgentLook } from "../../schemas/agent-look.schema.js";

const LINGERS_MS = 8000;
const listeners = new Set<() => void>();
let lookNow: AgentLook | null = null;
let fading = 0;

export async function whileAgentLooks<T>(look: AgentLook, work: () => Promise<T>): Promise<T> {
	window.clearTimeout(fading);
	lookedAt(look, "the agent looks");
	try {
		const done = await work();
		fading = window.setTimeout(() => lookedAt(null, "the agent looked away"), LINGERS_MS);
		return done;
	} catch (failure) {
		lookedAt(null, "the agent's look failed");
		throw failure;
	}
}

export function agentLookNow(): AgentLook | null {
	return lookNow;
}

export function watchAgentLook(changed: () => void): () => void {
	listeners.add(changed);
	return () => void listeners.delete(changed);
}

function lookedAt(look: AgentLook | null, reason: string): void {
	console.info(`[widgetarium] agent look ${JSON.stringify(lookNow)} → ${JSON.stringify(look)} (${reason})`);
	lookNow = look;
	for (const listener of [...listeners]) listener();
}
