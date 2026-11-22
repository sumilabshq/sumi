import type { Runtime } from "@widgetarium/data-framework";
import { workingIn } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import type { FocusedChatPort } from "@widgetarium/core/engine/focused-chat-port.js";
import { chatFacts } from "@sumi/chat-facts/contract";
import { questions } from "@widgetarium/questions/contract";
import { tasks } from "@widgetarium/tasks/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import type { ChatQuestions } from "./chat-questions.js";

interface TurnReport {
	readonly chatId: string;
	readonly isBusy: boolean;
	readonly isAsking: boolean;
	readonly isFailed: boolean;
	readonly isSeen: boolean;
	readonly firstAsked: string | null;
}

const MOST_BLOCKED_READ = 200;
const NOT_RECORDED = "[ink] chat {chat}: turn not recorded ({reason})";
const NOT_SWEPT = "[ink] chat marks not re-read after a tasks change ({reason})";
const TASK_UNREAD = "[ink] chat {chat}: whether its task is blocked is unknown, read as not blocked ({reason})";

export class ChatTurnReports {
	private readonly sessions = new Map<string, AssistantSession>();
	private readonly sent = new Map<string, TurnReport>();
	private readonly queued = new Map<string, Promise<void>>();
	private readonly waiting = new Set<string>();
	private sweeping: Promise<void> = Promise.resolve();
	private isSweepWaiting = false;

	constructor(
		private readonly app: Runtime,
		private readonly focusedChat: FocusedChatPort,
		private readonly questionsOf: ChatQuestions,
	) {
		app.routes.watch(questions.chat.questionsOfChat, undefined, () => this.reportBusy());
		app.routes.watch(tasks.board.chatLine, undefined, () => this.sweep());
		this.sweep();
	}

	sessionChanged(chatId: string, session: AssistantSession): void {
		this.sessions.set(chatId, session);
		this.report(chatId);
	}

	private reportBusy(): void {
		for (const [chatId, session] of this.sessions) {
			if (session.busy || workingIn(session.background).length > 0) {
				this.report(chatId);
			}
		}
	}

	private sweep(): void {
		if (this.isSweepWaiting) {
			return;
		}

		this.isSweepWaiting = true;
		this.sweeping = this.sweeping
			.then(async () => {
				this.isSweepWaiting = false;
				const [blocked, asking] = await Promise.all([this.blockedTaskOwners(), this.askingTabChats()]);
				const shownAsking = [...this.sent.values()].filter((sent) => sent.isAsking).map((sent) => sent.chatId);

				for (const chatId of new Set([...this.sessions.keys(), ...blocked, ...asking, ...shownAsking])) {
					this.report(chatId);
				}
			})
			.catch((failure: unknown) => {
				console.warn(NOT_SWEPT.replace("{reason}", String(failure)));
			});
	}

	private async blockedTaskOwners(): Promise<readonly string[]> {
		const answered = await this.app.send(tasks.board.all, {
			status: ["blocked"],
			updatedWithin: "all",
			limit: MOST_BLOCKED_READ,
		});

		if (!answered.ok) {
			throw new Error(answered.reason);
		}

		return answered.output.items.flatMap((task) => (task.owner === null ? [] : [task.owner]));
	}

	private async askingTabChats(): Promise<readonly string[]> {
		const answered = await this.app.send(chatFacts.openChats.all);

		if (!answered.ok) {
			throw new Error(answered.reason);
		}

		return answered.output.open.filter((chat) => chat.mark === "asking").map((chat) => chat.id);
	}

	private report(chatId: string): void {
		if (this.waiting.has(chatId)) {
			return;
		}

		this.waiting.add(chatId);
		const before = this.queued.get(chatId) ?? Promise.resolve();
		const next = before
			.then(() => this.send(chatId))
			.catch((failure: unknown) => {
				console.warn(NOT_RECORDED.replace("{chat}", chatId).replace("{reason}", String(failure)));
			});
		this.queued.set(chatId, next);
	}

	private async send(chatId: string): Promise<void> {
		this.waiting.delete(chatId);
		const report = await this.reportOf(chatId);
		const was = this.sent.get(chatId);

		if (was !== undefined && JSON.stringify(was) === JSON.stringify(report)) {
			return;
		}

		this.sent.set(chatId, report);
		const answered = await this.app.send(workspaces.chats.recordTurn, report);

		if (!answered.ok) {
			this.sent.delete(chatId);
			console.warn(NOT_RECORDED.replace("{chat}", chatId).replace("{reason}", answered.reason));
		}
	}

	private async reportOf(chatId: string): Promise<TurnReport> {
		const asked = this.sessions.get(chatId);
		const [hasOpenQuestion, isTaskBlocked] = await Promise.all([
			asked?.busy === true ? this.questionsOf.isWaitingOnPerson(chatId) : false,
			this.isTaskBlocked(chatId),
		]);
		const session = this.sessions.get(chatId) ?? asked;
		const isBusy = session === undefined ? false : session.busy || workingIn(session.background).length > 0;
		return {
			chatId,
			isBusy,
			isAsking: (isBusy && hasOpenQuestion) || isTaskBlocked,
			isFailed: session === undefined ? false : isFailedRun(session),
			isSeen: this.focusedChat.isOnScreen(chatId),
			firstAsked: session?.turns.find((turn) => turn.role === "user")?.text ?? null,
		};
	}

	private async isTaskBlocked(chatId: string): Promise<boolean> {
		const answered = await this.app.send(tasks.board.chatLine, { chat: chatId });

		if (!answered.ok) {
			console.warn(TASK_UNREAD.replace("{chat}", chatId).replace("{reason}", answered.reason));
			return false;
		}

		return answered.output.card?.status === "blocked";
	}
}

function isFailedRun(session: AssistantSession): boolean {
	return session.failure !== null || session.turns.at(-1)?.outcome === "failed";
}
