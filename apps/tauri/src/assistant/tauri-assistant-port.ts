import { NO_ASSISTANT } from "@widgetarium/core/engine/assistant-port.js";
import type {
	AssistantPort,
	AssistantProvider,
	AssistantSetup,
	QueueChange,
	RenderMarkdown,
} from "@widgetarium/core/engine/assistant-port.js";
import type { ClaudeOptions } from "@widgetarium/assistant";
import type { Emit } from "@widgetarium/core/engine/provider-stream.js";
import type { AssistantBridge, ClaudeStart, ProviderFacts, ProvidersAnswer } from "./assistant-bridge.js";
import { NO_CHAT_QUESTIONS } from "./chat-questions.js";
import { NO_CHAT_TASKS } from "./chat-tasks.js";
import { runTurn } from "./turn-run.js";
import { ChatSessions, ONE_CHAT_LINK } from "./chat-sessions.js";
import type { ChatsLink, StartChatTurn } from "./chat-sessions.js";
import type { TurnSession } from "./turn-session.js";

export interface PendingWrites {
	settled(): Promise<void>;
}

export interface LentFolders {
	take(): readonly string[];
}

export interface ClaudeChoices {
	value(): ClaudeOptions;
	save(next: ClaudeOptions): void;
}

export interface TauriAssistantDoors {
	readonly bridge: AssistantBridge;
	readonly attachments: PendingWrites;
	readonly folders: LentFolders;
	readonly claude: ClaudeChoices;
	readonly chats?: ChatsLink;
	readonly renderMarkdown?: RenderMarkdown;
}

export const PREFERRED_PROVIDER = "claude-code";

export const NO_PROVIDER_FOUND =
	"No AI command line was found on this machine: install Claude Code, Codex, OpenCode or Gemini CLI.";

export const UNKNOWN_PROVIDER = "This provider is not one Widgetarium can start here: {id}";

export const CANNOT_COMPACT = "{label} cannot compact a conversation.";

const NO_PROVIDER_LABEL = "No provider";

const CHAT_NOT_OPEN = "This chat is not open, so its queue cannot change.";

const SLASH = "/";

export interface TauriAssistantPort extends AssistantPort {
	readonly shownRead: () => Promise<void>;
	readonly handQueueToAgent: (chatId: string) => string | null;
}

type SessionDoors = Pick<
	TauriAssistantPort,
	"shownRead" | "session" | "onSession" | "send" | "retry" | "stop" | "clear" | "compact" | "changeQueue" | "handQueueToAgent"
>;

type SetupDoors = Pick<AssistantPort, "setup" | "onSetup" | "chooseProvider" | "setHelperAgents">;

interface PortHeld {
	answer: Promise<ProvidersAnswer> | null;
	chosen: string | null;
	helperAgents: boolean;
	readonly setupWatchers: Set<() => void>;
}

// TODO: the brief, the helper agents, persisted transcripts, call faces and chat cards from the Obsidian session are not wired in Tauri yet
export function tauriAssistantPort(doors: TauriAssistantDoors): TauriAssistantPort {
	const held: PortHeld = { answer: null, chosen: null, helperAgents: false, setupWatchers: new Set() };
	const sessions = new ChatSessions(doors.chats ?? ONE_CHAT_LINK, turnStarter(doors, held));
	const setup = setupDoorsOf(doors, held);
	const chatPorts = new Map<string, AssistantPort>();
	const port: TauriAssistantPort = {
		...NO_ASSISTANT,
		can: true,
		...sessionDoorsOf(sessions, doors, held),
		...setup,
		lendDrafts: (isDrafted) => sessions.lendDrafts(isDrafted),
		forChat: (chatId) => {
			const made = chatPorts.get(chatId) ?? { ...port, ...chatDoorsOf(sessions, chatId, { doors, held }) };
			chatPorts.set(chatId, made);
			return made;
		},
	};
	return port;
}

interface CompactParts {
	readonly doors: TauriAssistantDoors;
	readonly held: PortHeld;
}

function chatDoorsOf(sessions: ChatSessions, chatId: string, { doors, held }: CompactParts): Partial<AssistantPort> {
	return {
		session: () => sessions.nowOf(chatId),
		onSession: (changed) => sessions.watchChat(chatId, changed),
		send: async (said) => (await sessions.sessionOf(chatId)).send(said),
		sendFromHost: async (said) => (await sessions.sessionOf(chatId)).sendFromHost(said),
		retry: () => sessions.readyOf(chatId)?.retry(),
		stop: () => sessions.readyOf(chatId)?.stop(),
		changeQueue: (change) => changeQueueIn(sessions.readyOf(chatId), change),
		clear: async () => (await sessions.sessionOf(chatId)).clear(),
		compact: async () => {
			await refuseOrThrow(doors, held);
			await (await sessions.sessionOf(chatId)).compact();
		},
	};
}

function changeQueueIn(session: TurnSession | null, change: QueueChange): string | null {
	if (session === null) {
		return CHAT_NOT_OPEN;
	}

	return session.changeQueue(change);
}

function sessionDoorsOf(sessions: ChatSessions, doors: TauriAssistantDoors, held: PortHeld): SessionDoors {
	return {
		shownRead: () => sessions.readShown(),
		session: sessions.now,
		onSession: sessions.watch,
		send: async (said) => (await sessions.shownSession()).send(said),
		retry: () => sessions.shownIfReady()?.retry(),
		stop: () => sessions.shownIfReady()?.stop(),
		changeQueue: (change) => changeQueueIn(sessions.shownIfReady(), change),
		handQueueToAgent: (chatId) => sessions.readyOf(chatId)?.handQueueToAgent() ?? null,
		clear: async () => (await sessions.shownSession()).clear(),
		compact: () => compact(doors, held, sessions),
	};
}

function setupDoorsOf(doors: TauriAssistantDoors, held: PortHeld): SetupDoors {
	return {
		setup: async () => setupOf(await freshProviders(doors.bridge, held), held, doors.renderMarkdown ?? null),
		onSetup: (changed) => {
			held.setupWatchers.add(changed);
			return () => void held.setupWatchers.delete(changed);
		},
		chooseProvider: (id) => choose(doors, held, id),
		setHelperAgents: async (on) => {
			held.helperAgents = on;
			setupChanged(held);
		},
	};
}

function foundIn(answer: ProvidersAnswer): readonly ProviderFacts[] {
	return answer.providers.filter((facts) => facts.found);
}

function chosenIn(answer: ProvidersAnswer, chosen: string | null): ProviderFacts | null {
	const found = foundIn(answer);
	const preferred = found.find((facts) => facts.id === (chosen ?? PREFERRED_PROVIDER));
	return preferred ?? found[0] ?? null;
}

async function refuseCompact(bridge: AssistantBridge, held: PortHeld): Promise<string | null> {
	const provider = chosenIn(await providersOf(bridge, held), held.chosen);
	if (provider === null) {
		return NO_PROVIDER_FOUND;
	}

	return provider.compacts ? null : CANNOT_COMPACT.replace("{label}", provider.label);
}

async function compact(doors: TauriAssistantDoors, held: PortHeld, sessions: ChatSessions): Promise<void> {
	await refuseOrThrow(doors, held);
	await (await sessions.shownSession()).compact();
}

async function refuseOrThrow(doors: TauriAssistantDoors, held: PortHeld): Promise<void> {
	const refusal = await refuseCompact(doors.bridge, held);
	if (refusal !== null) {
		throw new Error(refusal);
	}
}

function shownProvider(facts: ProviderFacts): AssistantProvider {
	return { id: facts.id, label: facts.label, canEdit: true, reads: facts.reads, compacts: facts.compacts };
}

function setupOf(answer: ProvidersAnswer, held: PortHeld, renderMarkdown: RenderMarkdown | null): AssistantSetup {
	const chosen = chosenIn(answer, held.chosen);
	return {
		isReady: answer.project !== null && chosen !== null,
		providerLabel: chosen?.label ?? NO_PROVIDER_LABEL,
		providers: foundIn(answer).map(shownProvider),
		chosen: chosen?.id ?? "",
		helperAgents: held.helperAgents,
		renderMarkdown,
	};
}

function providersOf(bridge: AssistantBridge, held: PortHeld): Promise<ProvidersAnswer> {
	held.answer ??= bridge.providers().catch((failed: unknown) => {
		held.answer = null;
		throw failed;
	});
	return held.answer;
}

function freshProviders(bridge: AssistantBridge, held: PortHeld): Promise<ProvidersAnswer> {
	held.answer = null;
	return providersOf(bridge, held);
}

function setupChanged(held: PortHeld): void {
	held.setupWatchers.forEach((changed) => changed());
}

async function choose(doors: TauriAssistantDoors, held: PortHeld, id: string): Promise<void> {
	const answer = await providersOf(doors.bridge, held);
	if (!foundIn(answer).some((facts) => facts.id === id)) {
		throw new Error(UNKNOWN_PROVIDER.replace("{id}", id));
	}

	held.chosen = id;
	setupChanged(held);
}

function turnStarter(doors: TauriAssistantDoors, held: PortHeld): StartChatTurn {
	return async (chatId, asked, resumeOf, emit) => {
		const provider = chosenIn(await providersOf(doors.bridge, held), held.chosen);
		if (provider === null) {
			throw new Error(NO_PROVIDER_FOUND);
		}

		await doors.attachments.settled();
		const questions = doors.chats?.questions ?? NO_CHAT_QUESTIONS;
		const prompt = await withTrailers(doors, { chatId, asked });
		const ask = {
			provider,
			prompt,
			resume: resumeOf(provider.id),
			claude: provider.id === PREFERRED_PROVIDER ? claudeStartOf(doors.claude.value()) : null,
			folders: doors.folders.take(),
			chatId,
			isWaitingOnPerson: () => questions.isWaitingOnPerson(chatId),
		};
		const run = runTurn(doors.bridge, ask, hearingUsage(doors.claude, emit));
		void run.done.then(() => questions.turnEnded(chatId));
		return { run, providerId: provider.id, resumesWithoutAnId: provider.resumesWithoutAnId };
	};
}

// TRADE-OFF: a slash command goes as typed, so a turn started by one carries no task or answers trailer
async function withTrailers(
	doors: TauriAssistantDoors,
	{ chatId, asked }: { readonly chatId: string; readonly asked: string },
): Promise<string> {
	if (asked.startsWith(SLASH)) {
		return asked;
	}

	const [{ trailer }, answers] = await Promise.all([
		(doors.chats?.tasks ?? NO_CHAT_TASKS).askTrailer(chatId),
		(doors.chats?.questions ?? NO_CHAT_QUESTIONS).answersTrailer(chatId),
	]);
	return [asked, answers, trailer].filter((part) => part !== null).join("\n\n");
}

function claudeStartOf({ mode, model, effort }: ClaudeOptions): ClaudeStart {
	return { mode, model, effort };
}

function hearingUsage(claude: ClaudeChoices, emit: Emit): Emit {
	return (part) => {
		if ("usage" in part) {
			const was = claude.value();
			claude.save({ ...was, usage: part.usage });
			console.debug(
				`[widgetarium] claude usage ${JSON.stringify(was.usage)} → ${JSON.stringify(part.usage)} (the provider reported its plan usage)`,
			);
		}

		emit(part);
	};
}
