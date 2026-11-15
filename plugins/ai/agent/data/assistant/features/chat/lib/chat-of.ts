import type { ChatCards } from "@widgetarium/core/engine/assistant-cards.js";
import type {
	AssistantCall,
	AssistantSession,
	AssistantTurn,
	CallFace,
	QueuedMessage,
	SentPictures,
} from "@widgetarium/core/engine/assistant-port.js";
import { attachmentsIn } from "../../../shared/lib/attachment-trailer.js";
import type { TrailerEntry } from "../../../shared/lib/attachment-trailer.js";
import { shortPathOf } from "../../../shared/lib/short-path.js";
import type { AttachmentChip } from "../../../shared/schema/attachment.schema.js";
import type { Chat, QueuedShown, ShownTurn } from "../../../shared/schema/chat.schema.js";
import { turnStepsOf } from "./turn-steps.js";

export interface ChatSeen {
	readonly isAvailable: boolean;
	readonly session: AssistantSession;
	readonly cards: ChatCards;
	readonly faces: readonly (readonly CallFace[])[];
}

export function chatOf({ isAvailable, session, cards, faces }: ChatSeen): Chat {
	const runningCall = runningCallOf(session);
	return {
		isAvailable,
		session,
		turns: session.turns.map((turn, at) => shownTurnOf(turn, faces[at] ?? [], at)),
		queued: session.queued.map(queuedShownOf),
		runningCall,
		runningFace: runningCall === null ? null : (faces.at(-1)?.at(-1) ?? null),
		isAsking: isAskingOf(session, cards),
	};
}

export function runningCallOf(session: AssistantSession): AssistantCall | null {
	if (!session.busy) {
		return null;
	}

	const last = session.turns.at(-1)?.calls.at(-1);
	return last && !last.answered ? last : null;
}

function isAskingOf(session: AssistantSession, cards: ChatCards): boolean {
	const lastCards = cards.ofTurns[session.turns.length - 1];
	return !session.busy && Boolean(lastCards?.specApp ?? lastCards?.designApp);
}

function shownTurnOf(turn: AssistantTurn, faces: readonly CallFace[], at: number): ShownTurn {
	if (turn.role !== "user") {
		return agentTurnOf(turn, faces);
	}

	const { said, entries } = attachmentsIn(turn.text);
	return {
		turn,
		steps: turnStepsOf(said, []),
		attached: entries.map((entry, entryAt) => chipOf(entry, `${at}-${entryAt}`, turn.pictures)),
	};
}

function queuedShownOf(message: QueuedMessage): QueuedShown {
	const { said, entries } = attachmentsIn(message.text);
	return {
		id: message.id,
		isHeld: message.isHeld,
		said,
		attached: entries.map((entry, entryAt) => chipOf(entry, `${message.id}-${entryAt}`, message.pictures)),
	};
}

function agentTurnOf(turn: AssistantTurn, faces: readonly CallFace[]): ShownTurn {
	const callsWithFaces = turn.calls.flatMap((call, at) => {
		const face = faces[at];
		return face === undefined ? [] : [{ call, face }];
	});
	return {
		turn,
		steps: turnStepsOf(turn.text, callsWithFaces),
		attached: [],
	};
}

function chipOf(entry: TrailerEntry, id: string, pictures: SentPictures | undefined): AttachmentChip {
	return {
		id,
		name: entry.name,
		kind: entry.kind,
		size: entry.size,
		bytes: 0,
		preview: entry.path === null ? null : (pictures?.[entry.path] ?? null),
		where: entry.kind === "folder" ? shortPathOf(entry.path ?? "") : null,
	};
}
