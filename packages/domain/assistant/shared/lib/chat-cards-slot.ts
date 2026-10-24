import type { ComponentType, ReactNode } from "react";
import type { ChatCards } from "@widgetarium/core/engine/assistant-cards.js";
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
	readonly cards: ChatCards;
	readonly showCard: (key: string) => void;
}

export interface JobsStripProps {
	readonly showCard: (key: string) => void;
}

export interface ChatCardsSlot {
	around(cards: ChatCards, turn: TurnAt, asks: CardAsks): CardsAround;
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
