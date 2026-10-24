import type { AgentActivity, AgentEvent } from "../schema/agent-activity.schema.js";

export const NO_AGENT_ACTIVITY: AgentActivity = {
	isRunning: false,
	toolsRunning: 0,
	isAsking: false,
	typedAt: 0,
	finishedAt: 0,
	failedAt: 0,
	lastAt: 0,
};

type Change = (activity: AgentActivity, at: number) => Partial<AgentActivity>;

const CHANGES: Readonly<Record<AgentEvent, Change>> = {
	typing: (_activity, at) => ({ typedAt: at }),
	sent: () => ({ isRunning: true, toolsRunning: 0, isAsking: false }),
	toolStarted: (activity) => ({ isRunning: true, toolsRunning: activity.toolsRunning + 1 }),
	toolFinished: (activity) => ({ toolsRunning: Math.max(activity.toolsRunning - 1, 0) }),
	asked: () => ({ isAsking: true }),
	answered: () => ({ isAsking: false }),
	failed: (_activity, at) => ({ failedAt: at }),
	runFinished: (_activity, at) => ({ isRunning: false, toolsRunning: 0, finishedAt: at }),
};

export abstract class AgentActivityStore {
	abstract now(): AgentActivity;
	abstract watch(changed: () => void): () => void;
	abstract record(events: readonly AgentEvent[], at: number): void;
}

export class MemoryAgentActivityStore extends AgentActivityStore {
	private readonly watchers = new Set<() => void>();
	private activity: AgentActivity = NO_AGENT_ACTIVITY;

	override now(): AgentActivity {
		return this.activity;
	}

	override watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	override record(events: readonly AgentEvent[], at: number): void {
		const was = this.activity;
		this.activity = events.reduce((activity, event) => activityAfter(activity, event, at), was);
		console.debug(
			`[widgetarium] agent ${events.join(", ")}: ${JSON.stringify(was)} → ${JSON.stringify(this.activity)}`,
		);
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}

export function activityAfter(activity: AgentActivity, event: AgentEvent, at: number): AgentActivity {
	return { ...activity, ...CHANGES[event](activity, at), lastAt: at };
}
