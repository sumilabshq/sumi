import type { Job } from "../app-jobs.js";
import type { WidgetDefinition } from "../registry.js";
import { z } from "zod";
import { BlockerSchema, NO_CHAT_CARDS, TallySchema } from "./assistant-cards.js";
import type { ChatCards } from "./assistant-cards.js";

export type AssistantPhase = "thinking" | "tools" | "writing";

export const CallOutputCountsSchema = z.object({
	lines: z.number().optional(),
	hits: z.number().optional(),
	features: TallySchema.optional(),
	blockedBy: BlockerSchema.optional(),
});

export type CallOutputCounts = z.infer<typeof CallOutputCountsSchema>;

export const AssistantCallSchema = z.object({
	ref: z.string(),
	name: z.string(),
	input: z.record(z.string(), z.unknown()),
	output: z.string(),
	answered: z.boolean(),
	failed: z.boolean(),
	at: z.number(),
	answeredAt: z.number().optional(),
	textOffset: z.number().optional(),
	outputCounts: CallOutputCountsSchema.optional(),
});

export type AssistantCall = z.infer<typeof AssistantCallSchema>;

export type CallAsked = Pick<AssistantCall, "ref" | "name" | "input">;

export function freshCallOf(asked: CallAsked, at: number, textOffset: number): AssistantCall {
	return {
		...asked,
		output: "",
		answered: false,
		failed: false,
		at,
		textOffset,
	};
}

export const TurnOutcomeSchema = z.enum(["done", "stopped", "failed"]);

export type TurnOutcome = z.infer<typeof TurnOutcomeSchema>;

export const TurnRoleSchema = z.enum(["user", "agent", "compact"]);

export type TurnRole = z.infer<typeof TurnRoleSchema>;

export const AssistantTurnSchema = z.object({
	role: TurnRoleSchema,
	text: z.string(),
	calls: z.array(AssistantCallSchema),
	startedAt: z.number().optional(),
	endedAt: z.number().optional(),
	outcome: TurnOutcomeSchema.optional(),
});

export type AssistantTurn = z.infer<typeof AssistantTurnSchema>;

export interface AssistantSession {
	readonly turns: readonly AssistantTurn[];
	readonly busy: boolean;
	readonly failure: string | null;
	readonly tool: string | null;
	readonly phase: AssistantPhase | null;
	readonly spent: number;
}

export type CallKind = "search" | "read" | "edit" | "run" | "other";

export type DiffSign = "added" | "removed" | "kept";

export interface DiffLine {
	readonly sign: DiffSign;
	readonly text: string;
}

export interface CallChange {
	readonly file: string;
	readonly added: number;
	readonly removed: number;
	readonly lines: readonly DiffLine[];
}

export type CallMeta =
	| { readonly kind: "count"; readonly said: string }
	| { readonly kind: "change"; readonly added: number; readonly removed: number }
	| { readonly kind: "verdict"; readonly passed: boolean };

export interface CallFace {
	readonly kind: CallKind;
	readonly glyph: string;
	readonly verb: string;
	readonly doing: string;
	readonly object: string;
	readonly isCodeObject: boolean;
	readonly meta: CallMeta | null;
	readonly change: CallChange | null;
}

const DOING_TEXT = "{doing} {object}";

export function doingTextOf({ doing, object }: CallFace): string {
	return doing === "" ? object : DOING_TEXT.replace("{doing}", doing).replace("{object}", object);
}

export type AttachedFilesReach = "path" | "inline" | "none";

export interface ProviderReads {
	readonly images: boolean;
	readonly files: AttachedFilesReach;
	readonly mostAttached?: number;
}

export interface AssistantProvider {
	readonly id: string;
	readonly label: string;
	readonly canEdit: boolean;
	readonly reads?: ProviderReads;
	readonly compacts?: boolean;
}

export type RenderMarkdown = (element: HTMLElement, markdown: string) => () => void;

export interface AssistantSetup {
	readonly isReady: boolean;
	readonly providerLabel: string;
	readonly providers: readonly AssistantProvider[];
	readonly chosen: string;
	readonly helperAgents: boolean;
	readonly renderMarkdown: RenderMarkdown | null;
}

export interface AppJobs {
	readonly app: string;
	readonly jobs: readonly Job[];
}

export interface ProgressWidget {
	readonly definition: WidgetDefinition | null;
	readonly refusal: string | null;
}

export interface AssistantPort {
	readonly can: boolean;
	session(): AssistantSession;
	onSession(changed: () => void): () => void;
	setup(): Promise<AssistantSetup>;
	onSetup(changed: () => void): () => void;
	send(said: string): Promise<void>;
	retry(): void;
	stop(): void;
	clear(): Promise<void>;
	compact(): Promise<void>;
	chooseProvider(id: string): Promise<void>;
	setHelperAgents(on: boolean): Promise<void>;
	openProviders(): void;
	describeCall(call: AssistantCall): CallFace;
	cardsOf(session: AssistantSession): ChatCards;
	readAppFile(path: string): Promise<string | null>;
	onAppFile(path: string, changed: () => void): () => void;
	changeAppFile(path: string, edit: (text: string) => string): Promise<void>;
	jobs(): readonly AppJobs[];
	onJobs(changed: () => void): () => void;
	startJob(app: string, id: string): Promise<void>;
	stopJob(app: string, id: string): Promise<void>;
	buildIt(app: string): Promise<void>;
	approveDesign(app: string): Promise<void>;
	openDesign(app: string): Promise<void>;
	progressWidget(): ProgressWidget;
	forChat?(chatId: string): AssistantPort;
	lendDrafts?(isDrafted: (chatId: string) => boolean): void;
	sendFromHost?(said: string): Promise<void>;
}

export function portForChat(port: AssistantPort, chatId: string): AssistantPort {
	return port.forChat?.(chatId) ?? port;
}

export const ASSISTANT_NOT_AVAILABLE = "AI is not available on this host";

const NO_SESSION: AssistantSession = {
	turns: [],
	busy: false,
	failure: null,
	tool: null,
	phase: null,
	spent: 0,
};

const NO_JOBS: readonly AppJobs[] = [];
const NO_PROGRESS: ProgressWidget = { definition: null, refusal: ASSISTANT_NOT_AVAILABLE };
const unwatched = (): (() => void) => () => undefined;

const refused = (): Promise<never> => Promise.reject(new Error(ASSISTANT_NOT_AVAILABLE));

export const NO_ASSISTANT: AssistantPort = {
	can: false,
	session: () => NO_SESSION,
	onSession: unwatched,
	setup: refused,
	onSetup: unwatched,
	send: refused,
	retry: () => undefined,
	stop: () => undefined,
	clear: refused,
	compact: refused,
	chooseProvider: refused,
	setHelperAgents: refused,
	openProviders: () => undefined,
	describeCall: (call) => ({
		kind: "other",
		glyph: "widget",
		verb: "",
		doing: "",
		object: call.name,
		isCodeObject: false,
		meta: null,
		change: null,
	}),
	cardsOf: () => NO_CHAT_CARDS,
	readAppFile: async () => null,
	onAppFile: unwatched,
	changeAppFile: refused,
	jobs: () => NO_JOBS,
	onJobs: unwatched,
	startJob: refused,
	stopJob: refused,
	buildIt: refused,
	approveDesign: refused,
	openDesign: refused,
	progressWidget: () => NO_PROGRESS,
};
