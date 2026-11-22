import { isObject } from "@widgetarium/data-framework/is-object";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import { readerNamed } from "@widgetarium/core/engine/provider-stream.js";
import { EMPTY_SESSION, endedTurn, startedTurn, withPart } from "./session-steps.js";

const CLAUDE_STREAM = "claude-stream";

export function transcriptSessionOf(transcript: string, isWorking: boolean): AssistantSession {
	const read = readerNamed(CLAUDE_STREAM);
	const held = { session: EMPTY_SESSION, at: 0 };

	for (const line of transcript.split("\n")) {
		const event = eventIn(line);
		held.at = timeOf(event) ?? held.at;
		const asked = askedIn(event);

		if (asked !== null) {
			const settled = held.session.busy ? endedTurn(held.session, "done", held.at) : held.session;
			held.session = startedTurn(settled, [{ text: asked }], held.at);
			continue;
		}

		read(line, (part) => {
			held.session = withPart(held.session, part, held.at);
		});
	}

	return isWorking || !held.session.busy ? held.session : endedTurn(held.session, "done", held.at);
}

function eventIn(line: string): Readonly<Record<string, unknown>> | null {
	try {
		const parsed: unknown = JSON.parse(line);
		return isObject(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function timeOf(event: Readonly<Record<string, unknown>> | null): number | null {
	const stamp = event?.["timestamp"];
	const at = typeof stamp === "string" ? Date.parse(stamp) : Number.NaN;
	return Number.isNaN(at) ? null : at;
}

function askedIn(event: Readonly<Record<string, unknown>> | null): string | null {
	const message = event?.["message"];
	const content = isObject(message) ? message["content"] : null;
	return event?.["type"] === "user" && typeof content === "string" && content.trim() !== "" ? content : null;
}
