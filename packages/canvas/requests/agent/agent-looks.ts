import type { AgentLook } from "../../schema/agent-look.js";

const LINGERS_MS = 8000;
// TRADE-OFF: one look per window; the agent's shots and the person's canvas are two apps, and no host object reaches both yet.
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

export function agentPageOf(look: AgentLook | null, app: string): string | null {
	return look?.app === app && look.page ? look.page : null;
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
