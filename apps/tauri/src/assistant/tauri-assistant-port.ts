import { NO_ASSISTANT, workingIn } from "@widgetarium/core/engine/assistant-port.js";
import type {
	AssistantPort,
	AssistantSession,
	AssistantProvider,
	AssistantSetup,
	QueueChange,
	RenderMarkdown,
	QuickAskLauncher,
	TurnLauncher,
} from "@widgetarium/core/engine/assistant-port.js";
import { quickAnswerOf } from "./quick-ask-run.js";
import type { ClaudeOptions } from "@widgetarium/assistant/contract";
import type { Emit } from "@widgetarium/core/engine/provider-stream.js";
import type { AssistantBridge, ClaudeStart, ProviderFacts, ProvidersAnswer } from "./assistant-bridge.js";
import { NO_CHAT_QUESTIONS } from "./chat-questions.js";
import { NO_CHAT_TASKS } from "./chat-tasks.js";
import { LiveSessions } from "./live-sessions.js";
import { transcriptSessionOf } from "./agent-transcript.js";
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

export const NO_PROVIDER_FOUND = "No AI command line was found on this machine: install Claude Code.";

export const UNKNOWN_PROVIDER = "This provider is not one Widgetarium can start here: {id}";

export const CANNOT_COMPACT = "{label} cannot compact a conversation.";

const NO_PROVIDER_LABEL = "No provider";

const CHAT_NOT_OPEN = "This chat is not open, so its queue cannot change.";

const SLASH = "/";

const NO_AGENT_SESSION = "This chat has no Claude Code session yet, so it has no background agents to show.";

export interface TauriAssistantPort extends AssistantPort {
	readonly shownRead: () => Promise<void>;
	readonly handQueueToAgent: (chatId: string) => string | null;
}

type SessionDoors = Pick<
	TauriAssistantPort,
	| "shownRead"
	| "session"
	| "onSession"
	| "send"
	| "retry"
	| "stop"
	| "clear"
	| "compact"
	| "changeQueue"
	| "handQueueToAgent"
>;

type SetupDoors = Pick<AssistantPort, "setup" | "onSetup" | "chooseProvider" | "setHelperAgents">;

interface PortHeld {
	launcher: TurnLauncher | null;
	quickLauncher: QuickAskLauncher | null;
	answer: Promise<ProvidersAnswer> | null;
	chosen: string | null;
	helperAgents: boolean;
	readonly setupWatchers: Set<() => void>;
}

// TODO: the brief, the helper agents, persisted transcripts, call faces and chat cards from the Obsidian session are not wired in Tauri yet
export function tauriAssistantPort(doors: TauriAssistantDoors): TauriAssistantPort {
	const held: PortHeld = {
		launcher: null,
		quickLauncher: null,
		answer: null,
		chosen: null,
		helperAgents: false,
		setupWatchers: new Set(),
	};
	const live = new LiveSessions(doors.bridge, (chatId, part, stop) => sessions.heardIdle(chatId, part, stop));
	const sessions = new ChatSessions(doors.chats ?? ONE_CHAT_LINK, turnStarter(doors, { held, live }));
	const setup = setupDoorsOf(doors, held);
	const chatPorts = new Map<string, AssistantPort>();
	const port: TauriAssistantPort = {
		...NO_ASSISTANT,
		can: true,
		...sessionDoorsOf(sessions, { doors, held, live }),
		...setup,
		lendDrafts: (isDrafted) => sessions.lendDrafts(isDrafted),
		useLauncher: (launcher) => {
			held.launcher = launcher;
		},
		useQuickLauncher: (launcher) => {
			held.quickLauncher = launcher;
		},
		quickAsk: (prompt) => quickAsked(doors, held, prompt),
		forChat: (chatId) => {
			const made = chatPorts.get(chatId) ?? { ...port, ...chatDoorsOf(sessions, chatId, { doors, held, live }) };
			chatPorts.set(chatId, made);
			return made;
		},
	};
	return port;
}

interface CompactParts {
	readonly doors: TauriAssistantDoors;
	readonly held: PortHeld;
	readonly live: LiveSessions;
}

function chatDoorsOf(sessions: ChatSessions, chatId: string, { doors, held, live }: CompactParts): Partial<AssistantPort> {
	return {
		session: () => sessions.nowOf(chatId),
		onSession: (changed) => sessions.watchChat(chatId, changed),
		send: async (said, pictures) => (await sessions.sessionOf(chatId)).send(said, pictures),
		sendFromHost: async (said) => (await sessions.sessionOf(chatId)).sendFromHost(said),
		retry: () => sessions.readyOf(chatId)?.retry(),
		stop: () => sessions.readyOf(chatId)?.stop(),
		changeQueue: (change) => changeQueueIn(sessions.readyOf(chatId), change),
		clear: async () => {
			await (await sessions.sessionOf(chatId)).clear();
			live.end(chatId);
		},
		agentSession: (agentId) => agentSessionOf(doors.bridge, sessions, { chatId, agentId }),
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

function sessionDoorsOf(sessions: ChatSessions, { doors, held, live }: CompactParts): SessionDoors {
	return {
		shownRead: () => sessions.readShown(),
		session: sessions.now,
		onSession: sessions.watch,
		send: async (said, pictures) => (await sessions.shownSession()).send(said, pictures),
		retry: () => sessions.shownIfReady()?.retry(),
		stop: () => sessions.shownIfReady()?.stop(),
		changeQueue: (change) => changeQueueIn(sessions.shownIfReady(), change),
		handQueueToAgent: (chatId) => sessions.readyOf(chatId)?.handQueueToAgent() ?? null,
		clear: async () => {
			const shownId = sessions.shownId();
			await (await sessions.shownSession()).clear();
			if (shownId !== null) {
				live.end(shownId);
			}
		},
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

async function quickAsked(doors: TauriAssistantDoors, held: PortHeld, prompt: string): Promise<string> {
	const provider = chosenIn(await providersOf(doors.bridge, held), held.chosen);

	if (provider === null) {
		throw new Error(NO_PROVIDER_FOUND);
	}

	return quickAnswerOf(doors.bridge, {
		runner: provider.id,
		model: provider.id === PREFERRED_PROVIDER ? doors.claude.value().model : null,
		prompt,
		launcher: held.quickLauncher,
	});
}

function turnStarter(doors: TauriAssistantDoors, { held, live }: Omit<CompactParts, "doors">): StartChatTurn {
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
			launcher: held.launcher,
			isWaitingOnPerson: () => questions.isWaitingOnPerson(chatId),
		};
		const run = live.run(ask, hearingUsage(doors.claude, emit));
		void run.done.then(() => questions.turnEnded(chatId));
		return { run, providerId: provider.id, resumesWithoutAnId: provider.resumesWithoutAnId };
	};
}

interface AgentAsked {
	readonly chatId: string;
	readonly agentId: string;
}

async function agentSessionOf(
	bridge: AssistantBridge,
	sessions: ChatSessions,
	{ chatId, agentId }: AgentAsked,
): Promise<AssistantSession> {
	const resume = (await sessions.sessionOf(chatId)).resumeOf(PREFERRED_PROVIDER);

	if (resume === null) {
		throw new Error(NO_AGENT_SESSION);
	}

	const isWorking = workingIn(sessions.nowOf(chatId).background).some(({ id }) => id === agentId);
	return transcriptSessionOf(await bridge.readAgentTranscript(resume, agentId), isWorking);
}

// TRADE-OFF: a slash command goes as typed, so a turn started by one carries no task trailer
async function withTrailers(
	doors: TauriAssistantDoors,
	{ chatId, asked }: { readonly chatId: string; readonly asked: string },
): Promise<string> {
	if (asked.startsWith(SLASH)) {
		return asked;
	}

	const { trailer } = await (doors.chats?.tasks ?? NO_CHAT_TASKS).askTrailer(chatId);
	return [asked, trailer].filter((part) => part !== null).join("\n\n");
}

function claudeStartOf({ mode, model, effort, sandbox }: ClaudeOptions): ClaudeStart {
	return { mode, model, effort, sandbox };
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
