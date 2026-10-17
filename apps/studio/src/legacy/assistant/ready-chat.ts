import { createElement as h, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ChatCards } from "@widgetarium/core/engine/assistant-cards.js";
import type {
	AssistantCall,
	AssistantPort,
	AssistantSession,
	AssistantSetup,
	CallFace,
} from "@widgetarium/core/engine/assistant-port.js";
import { useTellsAgentActivity } from "./agent-activity.js";
import type { OpenByBuild } from "./cards/build-progress.js";
import type { Attachment } from "./cards/change-attachment.js";
import { JobsStrip } from "./cards/jobs-strip.js";
import { scrollToCard } from "./cards/pinned-run.js";
import { cardsAround, pinnedCardOf } from "./cards/turn-cards.js";
import type { CardAsks } from "./cards/turn-cards.js";
import { ChatLeadHead } from "./chat-lead.js";
import { Composer } from "./composer.js";
import { EmptyChat } from "./empty-chat.js";
import { FailureCard } from "./failure-card.js";
import { FailureSaid, useFailureLine } from "./failure-line.js";
import { FinishLine } from "./finish-line.js";
import type { Report } from "./failure-line.js";
import { RunningCall, runningCallOf } from "./running-call.js";
import { ToEndButton, useStuckToEnd } from "./stuck-scroll.js";
import { Turn } from "./turn.js";
import { Working } from "./working.js";

export interface ReadyChatProps {
	readonly port: AssistantPort;
	readonly setup: AssistantSetup;
	readonly setupFailure: string | null;
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
}

interface ScrollDraw {
	readonly port: AssistantPort;
	readonly session: AssistantSession;
	readonly setup: AssistantSetup;
	readonly cards: ChatCards;
	readonly asks: CardAsks;
}

const TITLE = "Widgetarium AI";
const RETRY = "Try again";
const RUN_FAILED = "The answer did not finish";
const NOT_SENT = "the message could not be sent";
const NOT_BUILT = "the build could not be started";
const NOT_APPROVED = "the design could not be approved";

export function ReadyChat({ port, setup, setupFailure, lead, title }: ReadyChatProps): ReactElement {
	const session = useSyncExternalStore(port.onSession, port.session);
	const cards = useMemo(() => port.cardsOf(session), [port, session]);
	const { scroller, isStuck, onScroll, toEnd } = useStuckToEnd([session.turns, session.busy]);
	const [openByBuild] = useState<OpenByBuild>(() => new Map());
	const [attachment, setAttachment] = useState<Attachment | null>(null);
	const { failure, report } = useFailureLine();
	const asks = chatAsksOf({ port, report, attachment, setAttachment });
	const chatRoot = useRef<HTMLDivElement>(null);
	const showCard = (key: string): void => scrollToCard(chatRoot.current, key);
	const pinned = pinnedCardOf(cards.pinned, { port, openByBuild, showCard });
	const typed = useTellsAgentActivity(session, cards);
	return h("div", { className: "wg-studio-ai", ref: chatRoot }, [
		h(ChatLeadHead, { key: "head", lead, title: title ?? TITLE }),
		h("div", { className: "wg-studio-ai-scroll-frame", key: "scroll" }, [
			h(
				"div",
				{ className: "wg-studio-ai-scroll", key: "scroll", ref: scroller, onScroll },
				scrollOf({ port, session, setup, cards, asks }),
			),
			isStuck ? null : h(ToEndButton, { key: "end", toEnd }),
		]),
		pinned ? h("div", { className: "wg-studio-ai-pinned", key: "pinned" }, pinned) : null,
		h(JobsStrip, { key: "strip", jobs: port, showCard }),
		h(FailureSaid, { key: "failure", failure: failure ?? setupFailure }),
		h(Composer, {
			key: "composer",
			busy: session.busy,
			attached: attachment ? { label: attachment.label, onClear: () => setAttachment(null) } : null,
			onSend: asks.send,
			onStop: () => port.stop(),
			onTyped: typed,
		}),
	]);
}

interface AskHolder {
	readonly port: AssistantPort;
	readonly report: Report;
	readonly attachment: Attachment | null;
	readonly setAttachment: (next: (held: Attachment | null) => Attachment | null) => void;
}

function chatAsksOf({ port, report, attachment, setAttachment }: AskHolder): CardAsks {
	const detached = (running: () => Promise<void>, said: string): void => {
		setAttachment(() => null);
		void report(running(), said).then((isDone) => {
			if (!isDone) setAttachment((held) => held ?? attachment);
		});
	};
	return {
		port,
		report,
		attach: (next) => setAttachment(() => next),
		buildIt: (app) => detached(() => port.buildIt(app), NOT_BUILT),
		approveDesign: (app) => detached(() => port.approveDesign(app), NOT_APPROVED),
		send: async (said) => {
			setAttachment(() => null);
			const isSent = await report(port.send(attachment ? attachment.rewrite(said) : said), NOT_SENT);
			if (!isSent) setAttachment((held) => held ?? attachment);
			return isSent;
		},
	};
}

function scrollOf({ port, session, setup, cards, asks }: ScrollDraw): ReactNode {
	if (session.turns.length === 0)
		return h(EmptyChat, { key: "empty", setup, onOpenProviders: () => port.openProviders() });
	return [
		...session.turns.flatMap((_turn, at) => turnNodesOf({ port, session, setup, cards, asks }, at)),
		busyLineOf(port, session),
		endLineOf(port, session),
	];
}

function turnNodesOf({ port, session, setup, cards, asks }: ScrollDraw, at: number): ReactNode[] {
	const turn = session.turns[at];
	if (!turn) return [];
	const isLast = at === session.turns.length - 1;
	const isLive = session.busy && isLast;
	const { before, after } = cardsAround(cards, { at, isAnswerable: isLast && !session.busy, isLive }, asks);
	const describe = (call: AssistantCall): CallFace => port.describeCall(call);
	return [...before, h(Turn, { key: at, turn, render: setup.renderMarkdown, describe, live: isLive }), ...after];
}

function busyLineOf(port: AssistantPort, session: AssistantSession): ReactElement | null {
	if (!session.busy) {
		return null;
	}

	const running = runningCallOf(session);
	if (!running) {
		return h(Working, { key: "busy", session });
	}

	return h(RunningCall, { key: "busy", call: running, face: port.describeCall(running), onStop: () => port.stop() });
}

function endLineOf(port: AssistantPort, session: AssistantSession): ReactElement | null {
	if (session.failure) {
		return h(FailureCard, {
			key: "failure",
			title: RUN_FAILED,
			reason: session.failure,
			action: { said: RETRY, run: () => port.retry() },
		});
	}

	const last = session.turns.at(-1);
	if (session.busy || last?.role !== "agent" || !last.outcome) {
		return null;
	}

	return h(FinishLine, { key: "finish", turn: last, outcome: last.outcome, copyText: copiedToClipboard });
}

function copiedToClipboard(text: string): Promise<void> {
	return navigator.clipboard.writeText(text);
}
