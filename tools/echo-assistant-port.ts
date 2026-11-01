import { NO_ASSISTANT } from "../packages/shared/core/src/engine/assistant-port.ts";
import type {
	AssistantPort,
	AssistantSession,
	AssistantSetup,
} from "../packages/shared/core/src/engine/assistant-port.ts";

const ECHO_SAID = "echo: {said}";

const ECHO_SETUP: AssistantSetup = {
	isReady: true,
	providerLabel: "Echo",
	providers: [
		{
			id: "echo",
			label: "Echo",
			canEdit: false,
		},
	],
	chosen: "echo",
	helperAgents: false,
	renderMarkdown: null,
};

const EMPTY_SESSION: AssistantSession = {
	turns: [],
	busy: false,
	failure: null,
	tool: null,
	phase: null,
	spent: 0,
	queued: [],
};

export function echoAssistantPort(): AssistantPort {
	const held = {
		session: EMPTY_SESSION,
	};
	const listeners = new Set<() => void>();
	return {
		...NO_ASSISTANT,
		can: true,
		session: () => held.session,
		onSession: (changed) => {
			listeners.add(changed);
			return () => void listeners.delete(changed);
		},
		setup: () => Promise.resolve(ECHO_SETUP),
		send: (said) => {
			held.session = echoedSession(held.session, said);
			listeners.forEach((changed) => changed());
			return Promise.resolve();
		},
	};
}

function echoedSession(session: AssistantSession, said: string): AssistantSession {
	return {
		...session,
		turns: [
			...session.turns,
			{
				role: "user",
				text: said,
				calls: [],
			},
			{
				role: "agent",
				text: ECHO_SAID.replace("{said}", said),
				calls: [],
				outcome: "done",
			},
		],
	};
}
