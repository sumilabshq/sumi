import type { ChatCards } from "@widgetarium/core/engine/assistant-cards.js";
import type {
	AssistantCall,
	AssistantSession,
	AssistantTurn,
	CallFace,
} from "@widgetarium/core/engine/assistant-port.js";
import { attachmentsIn } from "../../../shared/lib/attachment-trailer.js";
import type { TrailerEntry } from "../../../shared/lib/attachment-trailer.js";
import { shortPathOf } from "../../../shared/lib/short-path.js";
import type { AttachmentChip } from "../../../shared/schema/attachment.schema.js";
import type { Chat, ShownTurn } from "../../../shared/schema/chat.schema.js";

export interface ChatSeen {
	readonly isAvailable: boolean;
	readonly session: AssistantSession;
	readonly cards: ChatCards;
	readonly faces: readonly (readonly CallFace[])[];
	readonly previews: ReadonlyMap<string, string>;
}

export function chatOf({ isAvailable, session, cards, faces, previews }: ChatSeen): Chat {
	const runningCall = runningCallOf(session);
	return {
		isAvailable,
		session,
		turns: session.turns.map((turn, at) => shownTurnOf(turn, faces[at] ?? [], { at, previews })),
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

interface TurnPlace {
	readonly at: number;
	readonly previews: ReadonlyMap<string, string>;
}

function shownTurnOf(turn: AssistantTurn, faces: readonly CallFace[], place: TurnPlace): ShownTurn {
	if (turn.role !== "user") {
		return {
			turn,
			said: turn.text,
			faces: [...faces],
			attached: [],
		};
	}

	const { said, entries } = attachmentsIn(turn.text);
	return {
		turn,
		said,
		faces: [...faces],
		attached: entries.map((entry, entryAt) => chipOf(entry, `${place.at}-${entryAt}`, place.previews)),
	};
}

function chipOf(entry: TrailerEntry, id: string, previews: ReadonlyMap<string, string>): AttachmentChip {
	return {
		id,
		name: entry.name,
		kind: entry.kind,
		size: entry.size,
		bytes: 0,
		preview: entry.path === null ? null : (previews.get(entry.path) ?? null),
		where: entry.kind === "folder" ? shortPathOf(entry.path ?? "") : null,
	};
}
