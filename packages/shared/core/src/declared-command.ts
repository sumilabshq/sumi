import { useCallback, useContext, useMemo, useRef } from "react";
import { z } from "zod";
import { canOf } from "./gateway/create";
import { gatewayCache } from "./gateway/cache";
import type { Action, CanResult } from "@widgetarium/data-framework/gateway/contract";
import { declarationIn } from "./gateway/declared";
import {
	AnsweringCommand,
	answerAfterRun,
	fitOutput,
	runHandler,
} from "@widgetarium/data-framework/gateway/run-handler";
import type { CommandAnswer, HandlerContract } from "@widgetarium/data-framework/gateway/run-handler";
import { classNameOf } from "./gateway/declaration";
import type { Declaration } from "./gateway/declaration";
import { shutHostFor } from "@widgetarium/data-framework/gateway/handler-context";
import type { HandlerContext } from "@widgetarium/data-framework/gateway/handler-context";
import { useHandlerContext } from "./gateway/use-signal-until-unmount";
import { isObject } from "@widgetarium/data-framework/is-object";
import { REFUSAL_HANDLER } from "@widgetarium/data-framework/command-refusals";
import type { RefusalHandler } from "@widgetarium/data-framework/command-refusals";

const NOT_GIVEN = "{name} is not given";

type Heard = (answer: CommandAnswer<unknown>) => void;

const DRAWN = Symbol("drawn command");

export type DrawnCommand = Action<unknown, CommandAnswer<unknown>> & { readonly [DRAWN]: true };

interface DeclaredCommand {
	readonly name: string;
	readonly declaration: Declaration;
	readonly given: unknown;
	readonly readGatewayIdsNow: () => readonly string[];
	readonly context: HandlerContext;
	readonly heard: Heard | null;
	readonly unfed: Unfed;
}

interface Unfed {
	readonly can: (name: string, given: unknown) => CanResult;
	readonly refused: (given: unknown, reason: string) => CommandAnswer<unknown>;
	readonly answer: (name: string, input: unknown) => CommandAnswer<unknown>;
}

const UNFED_IN_BUILT_WIDGET: Unfed = {
	can: (name, given) => (isRunnable(given) ? canOf(given) : { can: false, reason: notGivenOf(name) }),
	refused: (given, reason) => {
		if (!isRunnable(given)) console.error(`[widgetarium] ${reason}`);
		return { ok: false, reason, ran: false };
	},
	answer: (name) => ({ ok: false, reason: notGivenOf(name), ran: false }),
};

const UNFED_ON_BOARD: Unfed = {
	can: (_name, given) => (given === undefined ? { can: true } : canOf(given)),
	refused: (_given, reason) => ({ ok: false, reason, ran: false }),
	answer: (name, input) => {
		console.log(`[widgetarium] ${name} sent`, input);
		return { ok: true, output: undefined };
	},
};

interface CommandAsk {
	readonly name: string;
	readonly declaration: Declaration;
	readonly given: unknown;
	readonly readGatewayIds: readonly string[];
	readonly handsRefusals: boolean;
}

export function useCommandOver({ name, declaration, given, readGatewayIds, handsRefusals }: CommandAsk): DrawnCommand {
	const readGatewayIdsNow = useReaderOfLatest(readGatewayIds);
	const context = useShutHostContext(name);
	const onRefused = useContext(REFUSAL_HANDLER);
	return useMemo(() => {
		const heard = handsRefusals ? hearerOf(name, onRefused) : null;
		const unfed = handsRefusals ? UNFED_IN_BUILT_WIDGET : UNFED_ON_BOARD;
		return commandOver({ name, declaration, given, readGatewayIdsNow, context, heard, unfed });
	}, [given, context, onRefused]);
}

export function isDrawnCommand(held: unknown): held is DrawnCommand {
	return typeof held === "function" && DRAWN in held;
}

function hearerOf(name: string, onRefused: RefusalHandler): Heard {
	return (answer) => {
		if (answer.ok) {
			console.debug(`[widgetarium] ${name} ran`);
			return;
		}
		console.warn(`[widgetarium] ${name} refused: ${answer.reason}`, { ran: answer.ran });
		onRefused({ name, reason: answer.reason, ran: answer.ran });
	};
}

function useReaderOfLatest<T>(held: T): () => T {
	const latest = useRef(held);
	latest.current = held;
	return useCallback(() => latest.current, []);
}

function useShutHostContext(name: string): HandlerContext {
	const host = useMemo(() => shutHostFor(name), [name]);
	return useHandlerContext(host);
}

function commandOver(command: DeclaredCommand): DrawnCommand {
	const run = async (input: unknown): Promise<CommandAnswer<unknown>> => {
		const answer = await runDeclaredCommand(command, input).catch((thrown: unknown) =>
			thrownAnswer(command.name, thrown, false),
		);
		command.heard?.(answer);
		return answer;
	};
	return Object.assign(run, { can: () => command.unfed.can(command.name, command.given), [DRAWN]: true as const });
}

async function runDeclaredCommand(command: DeclaredCommand, input: unknown): Promise<CommandAnswer<unknown>> {
	const { name, declaration, given, unfed } = command;
	const allowed = unfed.can(name, given);
	if (!allowed.can) return unfed.refused(given, allowed.reason);
	const fitted = fitOutput(declaration.schema, input);
	if (!fitted.ok) return { ...fitted, ran: false };
	const answered = await runToAnswer(command, fitted.output);
	if (!answered.ok && !answered.ran) return answered;
	return answerAfterWrite(command, answered).catch((thrown: unknown) => thrownAnswer(name, thrown, true));
}

async function answerAfterWrite(command: DeclaredCommand, answered: CommandAnswer<unknown>) {
	await gatewayCache.refetch(command.readGatewayIdsNow());
	if (!answered.ok) return answered;
	return answerAfterRun(command.name, command.declaration.output, answered.output);
}

function thrownAnswer(name: string, thrown: unknown, ran: boolean): CommandAnswer<unknown> {
	console.error(`[widgetarium] ${name} threw`, { ran }, thrown);
	return { ok: false, reason: thrown instanceof Error ? thrown.message : String(thrown), ran };
}

function notGivenOf(name: string): string {
	return NOT_GIVEN.replace("{name}", name);
}

function isRunnable(given: unknown): given is object {
	return typeof given === "function" || (isObject(given) && typeof given["run"] === "function");
}

function runToAnswer(command: DeclaredCommand, input: unknown): Promise<CommandAnswer<unknown>> {
	const { name, given, context } = command;
	if (given instanceof AnsweringCommand) return given.run(input);
	if (typeof given === "function") return runHandler({ run: given }, input, { output: z.unknown(), name }, context);
	if (!isRunnable(given)) return Promise.resolve(command.unfed.answer(name, input));
	return runHandler(given, input, handlerContractOf(given), context);
}

function handlerContractOf(handler: object): HandlerContract {
	const handlerClass: unknown = Reflect.get(handler, "constructor");
	const declaration = declarationIn(handlerClass);
	return { output: declaration ? declaration.output : z.unknown(), name: classNameOf(handlerClass) };
}
