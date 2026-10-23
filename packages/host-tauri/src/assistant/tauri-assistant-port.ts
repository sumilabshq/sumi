import { NO_ASSISTANT } from "@widgetarium/core/engine/assistant-port.js";
import type { AssistantPort, AssistantProvider, AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import type { ClaudeOptions, PlanUsage } from "@widgetarium/assistant";
import type { Emit } from "@widgetarium/core/engine/provider-stream.js";
import type { AssistantBridge, ClaudeStart, ProviderFacts, ProvidersAnswer } from "./assistant-bridge.js";
import { runTurn } from "./turn-run.js";
import { NO_CHAT_HISTORY, createTurnSession } from "./turn-session.js";
import type { ChatHistory, StartTurn, TurnSession } from "./turn-session.js";

export interface PendingWrites {
	settled(): Promise<void>;
}

export interface LentFolders {
	take(): readonly string[];
}

export interface ClaudeChoices {
	now(): ClaudeOptions;
	heardUsage(usage: PlanUsage): void;
}

export interface TauriAssistantDoors {
	readonly bridge: AssistantBridge;
	readonly attachments: PendingWrites;
	readonly folders: LentFolders;
	readonly claude: ClaudeChoices;
	readonly history?: ChatHistory;
}

export const PREFERRED_PROVIDER = "claude-code";

export const NO_PROVIDER_FOUND =
	"No AI command line was found on this machine: install Claude Code, Codex, OpenCode or Gemini CLI.";

export const UNKNOWN_PROVIDER = "This provider is not one Widgetarium can start here: {id}";

export const CANNOT_COMPACT = "{label} cannot compact a conversation.";

const NO_PROVIDER_LABEL = "No provider";

interface PortHeld {
	answer: Promise<ProvidersAnswer> | null;
	chosen: string | null;
	helperAgents: boolean;
	readonly setupWatchers: Set<() => void>;
}

// TODO: the brief, the helper agents, persisted transcripts, call faces and chat cards from the Obsidian session are not wired in Tauri yet
export function tauriAssistantPort(doors: TauriAssistantDoors): AssistantPort {
	const held: PortHeld = { answer: null, chosen: null, helperAgents: false, setupWatchers: new Set() };
	const session = createTurnSession(turnStarter(doors, held), Date.now, doors.history ?? NO_CHAT_HISTORY);
	return {
		...NO_ASSISTANT,
		can: true,
		session: () => session.now(),
		onSession: (changed) => session.watch(changed),
		setup: async () => setupOf(await freshProviders(doors.bridge, held), held),
		onSetup: (changed) => {
			held.setupWatchers.add(changed);
			return () => void held.setupWatchers.delete(changed);
		},
		send: (said) => session.send(said),
		retry: () => session.retry(),
		stop: () => session.stop(),
		clear: () => session.clear(),
		compact: () => compact(doors, held, session),
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

async function compact(doors: TauriAssistantDoors, held: PortHeld, session: TurnSession): Promise<void> {
	const refusal = await refuseCompact(doors.bridge, held);
	if (refusal !== null) {
		throw new Error(refusal);
	}

	await session.compact();
}

function shownProvider(facts: ProviderFacts): AssistantProvider {
	return { id: facts.id, label: facts.label, canEdit: true, reads: facts.reads, compacts: facts.compacts };
}

function setupOf(answer: ProvidersAnswer, held: PortHeld): AssistantSetup {
	const chosen = chosenIn(answer, held.chosen);
	return {
		isReady: answer.project !== null && chosen !== null,
		providerLabel: chosen?.label ?? NO_PROVIDER_LABEL,
		providers: foundIn(answer).map(shownProvider),
		chosen: chosen?.id ?? "",
		helperAgents: held.helperAgents,
		renderMarkdown: null,
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

function turnStarter(doors: TauriAssistantDoors, held: PortHeld): StartTurn {
	return async (asked, resumeOf, emit) => {
		const provider = chosenIn(await providersOf(doors.bridge, held), held.chosen);
		if (provider === null) {
			throw new Error(NO_PROVIDER_FOUND);
		}

		await doors.attachments.settled();
		const ask = {
			provider,
			prompt: asked,
			resume: resumeOf(provider.id),
			claude: provider.id === PREFERRED_PROVIDER ? claudeStartOf(doors.claude.now()) : null,
			folders: doors.folders.take(),
		};
		const run = runTurn(doors.bridge, ask, hearingUsage(doors.claude, emit));
		return { run, providerId: provider.id, resumesWithoutAnId: provider.resumesWithoutAnId };
	};
}

function claudeStartOf({ mode, model, effort }: ClaudeOptions): ClaudeStart {
	return { mode, model, effort };
}

function hearingUsage(claude: ClaudeChoices, emit: Emit): Emit {
	return (part) => {
		if ("usage" in part) {
			claude.heardUsage(part.usage);
		}

		emit(part);
	};
}
