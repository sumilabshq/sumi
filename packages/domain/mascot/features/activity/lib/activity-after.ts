import type { AgentActivity, AgentEvent } from "../../../shared/schema/agent-activity.schema.js";

type Change = (activity: AgentActivity, at: number) => Partial<AgentActivity>;

const CHANGES: Readonly<Record<AgentEvent, Change>> = {
	typing: (_activity, at) => ({
		typedAt: at,
	}),
	sent: () => ({
		isRunning: true,
		toolsRunning: 0,
		isAsking: false,
	}),
	toolStarted: (activity) => ({
		isRunning: true,
		toolsRunning: activity.toolsRunning + 1,
	}),
	toolFinished: (activity) => ({
		toolsRunning: Math.max(activity.toolsRunning - 1, 0),
	}),
	asked: () => ({
		isAsking: true,
	}),
	answered: () => ({
		isAsking: false,
	}),
	failed: (_activity, at) => ({
		failedAt: at,
	}),
	runFinished: (_activity, at) => ({
		isRunning: false,
		toolsRunning: 0,
		finishedAt: at,
	}),
};

export function activityAfter(activity: AgentActivity, events: readonly AgentEvent[], at: number): AgentActivity {
	return events.reduce(
		(was, event) => ({
			...was,
			...CHANGES[event](was, at),
			lastAt: at,
		}),
		activity,
	);
}
