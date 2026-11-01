import type { ComponentType, ReactNode } from "react";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import type { Report } from "./failure-line.js";

export interface AttachedChange {
	readonly label: string;
	rewrite(said: string): string;
}

export interface CardAsks {
	readonly report: Report;
	send(said: string): Promise<boolean>;
	attach(change: AttachedChange): void;
	runDetached(running: () => Promise<void>, failedSaid: string): void;
}

export interface TurnAt {
	readonly at: number;
	readonly isAnswerable: boolean;
	readonly isLive: boolean;
}

export interface CardsAround {
	readonly before: readonly ReactNode[];
	readonly after: readonly ReactNode[];
}

export interface PinnedCardProps {
	readonly session: AssistantSession;
	readonly showCard: (key: string) => void;
}

export interface JobsStripProps {
	readonly showCard: (key: string) => void;
}

export interface ChatCardsSlot {
	around(session: AssistantSession, turn: TurnAt, asks: CardAsks): CardsAround;
	readonly Pinned: ComponentType<PinnedCardProps>;
	readonly Strip: ComponentType<JobsStripProps>;
}

const NO_CARDS_AROUND: CardsAround = {
	before: [],
	after: [],
};

export const NO_CHAT_CARDS_SLOT: ChatCardsSlot = {
	around: () => NO_CARDS_AROUND,
	Pinned: () => null,
	Strip: () => null,
};
