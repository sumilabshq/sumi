import type { CommandAnswer } from "./gateway/run-handler";

export interface QueryHandle<Data> {
	readonly data: Data;
	readonly isLoading: boolean;
	readonly failure: string | null;
}

export interface AskedQueryHandle<In, Data> extends QueryHandle<Data> {
	ask(input: In): void;
}

export interface PageItems<Item> {
	readonly items: readonly Item[];
}

export interface PagedQueryHandle<Item> extends QueryHandle<PageItems<Item>> {
	readonly total: number | null;
	readonly hasMore: boolean;
	more(): void;
}

export type AskedPagedQueryHandle<In, Item> = PagedQueryHandle<Item> & { ask(input: In): void };

export interface CommandState {
	readonly isRunning: boolean;
	readonly refusal: string | null;
	readonly can: boolean;
	readonly cannotBecause: string | null;
}

export interface BoundCommandHandle<Out> extends CommandState {
	run(): Promise<CommandAnswer<Out>>;
}

export type CommandRun<In, Out> = [In] extends [void | undefined]
	? () => Promise<CommandAnswer<Out>>
	: (input: In) => Promise<CommandAnswer<Out>>;

export interface CommandHandle<In, Out> extends CommandState {
	readonly run: CommandRun<In, Out>;
	with(input: In): BoundCommandHandle<Out>;
}
