import { Suspense, createElement as h, lazy } from "react";
import type { ReactElement, ReactNode } from "react";
import type {
	Blocker,
	ChatCards,
	FailedCheck,
	PinnedCard,
	TurnCards,
} from "@widgetarium/core/engine/assistant-cards.js";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { FailureCard } from "@widgetarium/assistant";
import type { Report } from "@widgetarium/assistant";
import { BuildProgress } from "./build-progress.js";
import type { OpenByBuild } from "./build-progress.js";
import { changeAttachmentOf } from "./change-attachment.js";
import type { Attachment } from "./change-attachment.js";
import { DesignCard } from "./design-card.js";
import { PinnedRun } from "./pinned-run.js";
import { ResultPair } from "./result-pair.js";

export interface CardAsks {
	readonly port: AssistantPort;
	readonly report: Report;
	send(said: string): Promise<boolean>;
	buildIt(app: string): void;
	approveDesign(app: string): void;
	attach(attachment: Attachment): void;
}

export interface PinnedAsks {
	readonly port: AssistantPort;
	readonly openByBuild: OpenByBuild;
	readonly showCard: (key: string) => void;
}

export interface CardsAround {
	readonly before: readonly ReactNode[];
	readonly after: readonly ReactNode[];
}

export interface TurnAt {
	readonly at: number;
	readonly isAnswerable: boolean;
	readonly isLive: boolean;
}

const NOT_OPENED = "the design of {app} could not be opened";
const CHECK_FAILED = "A check failed";
const FIX_IT = "Fix it";
const FIX_IT_ASKED = "Fix it: `{step}` failed with: {reason}";
const FIX_BLOCKER_ASKED = "Fix it: {feature} is blocked: {why}";
const NO_CARDS_AROUND: CardsAround = { before: [], after: [] };

export function cardsAround(cards: ChatCards, { at, isAnswerable, isLive }: TurnAt, asks: CardAsks): CardsAround {
	const turn = cards.ofTurns[at];
	if (!turn) return NO_CARDS_AROUND;
	return {
		before: [buildRunCardOf(turn, at, asks)],
		after: [
			specCardOf(turn.specApp, { at, isAnswerable }, asks),
			designCardOf(turn.designApp, { at, isAnswerable }, asks),
			turn.result && !isLive
				? h(ResultPair, { key: `result-${at}`, result: turn.result, onFix: fixBlockerOf(asks) })
				: null,
			isAnswerable ? failedCheckCardOf(turn.result?.failedCheck ?? null, asks) : null,
		],
	};
}

export function pinnedCardOf(
	pinned: PinnedCard | null,
	{ port, openByBuild, showCard }: PinnedAsks,
): ReactElement | null {
	if (!pinned) return null;
	if (pinned.kind === "run") return h(PinnedRun, { run: pinned.run, builds: pinned.builds, showCard });
	return h(BuildProgress, { key: pinned.build.key, build: pinned.build, progress: port.progressWidget(), openByBuild });
}

function buildRunCardOf(turn: TurnCards, at: number, asks: CardAsks): ReactElement | null {
	if (!turn.build) return null;
	const { port, report } = asks;
	return h(
		Suspense,
		{
			key: `${turn.build.run.key}-${at}`,
			fallback: null,
		},
		h(BuildRunCard, { card: turn.build, files: port, jobs: port, report }),
	);
}

function fixBlockerOf(asks: CardAsks): (blocker: Blocker) => void {
	return ({ feature, why }) => void asks.send(FIX_BLOCKER_ASKED.replace("{feature}", feature).replace("{why}", why));
}

function failedCheckCardOf(failed: FailedCheck | null, asks: CardAsks): ReactElement | null {
	if (!failed) {
		return null;
	}

	const asked = FIX_IT_ASKED.replace("{step}", failed.step).replace("{reason}", failed.reason);
	return h(FailureCard, {
		key: "failed-check",
		title: CHECK_FAILED,
		reason: failed.reason,
		action: { said: FIX_IT, run: () => void asks.send(asked) },
	});
}

function specCardOf(
	app: string | null,
	{ at, isAnswerable }: Omit<TurnAt, "isLive">,
	asks: CardAsks,
): ReactElement | null {
	if (!app) return null;
	return h(
		Suspense,
		{
			key: `spec-${at}-${app}`,
			fallback: null,
		},
		h(SpecCard, {
			app,
			files: asks.port,
			isAnswerable,
			onBuild: () => asks.buildIt(app),
			onChange: () => asks.attach(changeAttachmentOf(app, "spec")),
		}),
	);
}

function designCardOf(
	app: string | null,
	{ at, isAnswerable }: Omit<TurnAt, "isLive">,
	asks: CardAsks,
): ReactElement | null {
	if (!app) return null;
	return h(DesignCard, {
		key: `design-${at}-${app}`,
		app,
		files: asks.port,
		isAnswerable,
		onOpen: () => void asks.report(asks.port.openDesign(app), NOT_OPENED.replace("{app}", app)),
		onApprove: () => asks.approveDesign(app),
		onChange: () => asks.attach(changeAttachmentOf(app, "design")),
	});
}

const BuildRunCard = lazy(() => import("./build-run-card.js").then(({ BuildRunCard: card }) => ({ default: card })));
const SpecCard = lazy(() => import("./spec-card.js").then(({ SpecCard: card }) => ({ default: card })));
