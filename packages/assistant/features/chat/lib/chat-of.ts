import type { AssistantTurn } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantSessionGateway } from "../../../gateways/assistant-session/assistant-session.gateway.js";
import { attachmentsIn } from "../../../shared/lib/attachment-trailer.js";
import { shortPathOf } from "../../../shared/lib/short-path.js";
import type { TrailerEntry } from "../../../shared/lib/attachment-trailer.js";
import type { AttachmentChip } from "../../../shared/schema/attachment.schema.js";
import type { Chat, ShownTurn } from "../../../shared/schema/chat.schema.js";
import { chatMomentOf } from "./agent-activity.js";
import { runningCallOf } from "./running-call-of.js";

export function chatOf(gateway: AssistantSessionGateway, previews: ReadonlyMap<string, string>): Chat {
	const session = gateway.session();
	const cards = gateway.cardsOf(session);
	const running = runningCallOf(session);
	return {
		isAvailable: gateway.isAvailable(),
		session,
		cards,
		turns: session.turns.map((turn, at) => shownTurnOf(gateway, turn, { at, previews })),
		runningFace: running ? gateway.describeCall(running) : null,
		isAsking: chatMomentOf(session, cards).isAsking,
	};
}

interface TurnPlace {
	readonly at: number;
	readonly previews: ReadonlyMap<string, string>;
}

function shownTurnOf(gateway: AssistantSessionGateway, turn: AssistantTurn, place: TurnPlace): ShownTurn {
	const faces = turn.calls.map((call) => gateway.describeCall(call));

	if (turn.role !== "user") {
		return {
			turn,
			said: turn.text,
			faces,
			attached: [],
		};
	}

	const { said, entries } = attachmentsIn(turn.text);
	return {
		turn,
		said,
		faces,
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
