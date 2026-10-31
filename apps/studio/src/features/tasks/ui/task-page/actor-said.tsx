import { createElement as h } from "react";
import type { ReactNode } from "react";
import type { Actor } from "@widgetarium/tasks";
import { ChatLink } from "./chat-link.js";

export interface ActorSaidProps {
	readonly actor: Actor;
}

const ACTOR_WORDS: Readonly<Record<Actor["kind"], string>> = {
	agent: "agent",
	person: "you",
	host: "Sumi",
};

export function ActorSaid({ actor }: ActorSaidProps): ReactNode {
	if (actor.kind !== "agent") {
		return ACTOR_WORDS[actor.kind];
	}

	return <ChatLink chatId={actor.chat} />;
}
