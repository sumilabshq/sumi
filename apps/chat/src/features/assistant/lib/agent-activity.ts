import { useEffect, useRef } from "react";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import { useCommand } from "@widgetarium/core/requests";
import { AgentEventSchema, RecordAgentEventsCommand } from "@widgetarium/mascot";
import type { AgentEvent } from "@widgetarium/mascot";

export interface ChatMoment {
	readonly isBusy: boolean;
	readonly failure: string | null;
	readonly calls: ReadonlyMap<string, CallMoment>;
	readonly isAsking: boolean;
}

interface CallMoment {
	readonly isAnswered: boolean;
	readonly isFailed: boolean;
}

export function chatMomentOf({ session, isAsking }: ChatSeen): ChatMoment {
	const calls = session.turns.flatMap((turn) => turn.calls);
	return {
		isBusy: session.busy,
		failure: session.failure,
		calls: new Map(calls.map((call) => [call.ref, { isAnswered: call.answered, isFailed: call.failed }])),
		isAsking,
	};
}

export function agentEventsBetween(was: ChatMoment, now: ChatMoment): AgentEvent[] {
	const runEvents = eventsHappened({
		failed: now.failure !== null && now.failure !== was.failure,
		runFinished: was.isBusy && !now.isBusy,
		asked: !was.isAsking && now.isAsking,
		answered: was.isAsking && !now.isAsking,
	});
	return [...eventsHappened({ sent: !was.isBusy && now.isBusy }), ...callEventsBetween(was, now), ...runEvents];
}

export interface ChatSeen {
	readonly session: AssistantSession;
	readonly isAsking: boolean;
}

export function useTellsAgentActivity({ session, isAsking }: ChatSeen): () => void {
	const record = useCommand(RecordAgentEventsCommand);
	const told = useRef<ChatMoment>(chatMomentOf({ session, isAsking }));
	useEffect(() => {
		const now = chatMomentOf({ session, isAsking });
		const events = agentEventsBetween(told.current, now);
		told.current = now;
		if (events.length > 0) {
			void record.run({ events });
		}
	}, [session, isAsking, record]);
	return () => void record.run({ events: ["typing"] });
}

function callEventsBetween(was: ChatMoment, now: ChatMoment): AgentEvent[] {
	return [...now.calls].flatMap(([ref, call]) => callEventsOf(was.calls.get(ref), call));
}

function callEventsOf(before: CallMoment | undefined, call: CallMoment): AgentEvent[] {
	if (before === undefined) {
		return eventsHappened({ toolStarted: !call.isAnswered, failed: call.isFailed });
	}

	return eventsHappened({
		toolFinished: !before.isAnswered && call.isAnswered,
		failed: call.isFailed && !before.isFailed,
	});
}

function eventsHappened(happened: Partial<Record<AgentEvent, boolean>>): AgentEvent[] {
	return AgentEventSchema.options.filter((event) => happened[event] === true);
}
