import { createElement as h } from "react";
import type { ReactElement } from "react";
import { z } from "zod";
import { ISlot } from "../packages/core/src/gateway/declared.ts";
import { ICommand, IQuery } from "../packages/core/src/gateway/queries.ts";
import { PageInputSchema, PageOf, pageAt, offsetOfCursor } from "../packages/core/src/gateway/page.ts";
import type { Page } from "../packages/core/src/gateway/page.ts";
import { rowOf } from "../packages/core/src/gateway/create.ts";
import type { RecordRef } from "../packages/core/src/gateway/declared.ts";
import type { FailedViewProps, InjectProps } from "../packages/core/src/widget-builder-types.ts";
import { inject } from "../packages/core/src/widget-builder.ts";

export const TaskSchema = z.object({ id: z.string(), title: z.string(), done: z.boolean() });
export type Task = z.output<typeof TaskSchema>;

export const TASKS: readonly Task[] = Array.from({ length: 150 }, (_, at) => ({
	id: `t${at}`,
	title: `Task ${at}`,
	done: at % 2 === 0,
}));

const TaskAskSchema = z.object({ id: z.string() });
const FilterSchema = PageInputSchema.extend({ done: z.boolean().optional() });
const RenameSchema = z.object({ id: z.string(), title: z.string().min(1) });

export const ports = inject({
	titleQuery: IQuery.output(z.string().default("Tasks")),
	tasksQuery: IQuery.input(PageInputSchema).output(PageOf(TaskSchema)),
	taskQuery: IQuery.input(TaskAskSchema).output(TaskSchema.nullable()),
	filteredQuery: IQuery.input(FilterSchema).output(PageOf(TaskSchema)),
	renameCommand: ICommand.input(RenameSchema).output(TaskSchema),
	extras: ISlot.array(),
});

export type BoardProps = InjectProps<typeof ports>;

type Row = Task & { readonly ref: RecordRef };

export const askedIds: string[] = [];

let titleSettles: (title: string) => void = () => {};
const titleRead = new Promise<string>((settled) => (titleSettles = settled));
export const settleTitle = (title: string): void => titleSettles(title);

export class TitleQuery extends IQuery.output(z.string()) {
	get(): Promise<string> {
		return titleRead;
	}
}

export class SlowTitleQuery extends IQuery.output(z.string()) {
	get(): Promise<string> {
		return new Promise(() => {});
	}
}

function pageOf(rows: readonly Task[], cursor: string | null | undefined, limit: number): Page<Row> {
	const offset = offsetOfCursor(cursor);
	const items = rows.slice(offset, offset + limit).map((task) => rowOf<Task>(task, task.id));
	return pageAt(items, offset, rows.length);
}

export class TasksQuery extends IQuery.input(PageInputSchema).output(PageOf(TaskSchema)) {
	query(input: z.input<typeof PageInputSchema>): Page<Row> {
		return pageOf(TASKS, input.cursor, input.limit ?? 100);
	}
}

export class TaskQuery extends IQuery.input(TaskAskSchema).output(TaskSchema.nullable()) {
	query(input: { readonly id: string }): Task | null {
		askedIds.push(input.id);
		return TASKS.find((task) => task.id === input.id) ?? null;
	}
}

export class FilteredQuery extends IQuery.input(FilterSchema).output(PageOf(TaskSchema)) {
	query(input: z.input<typeof FilterSchema>): Page<Row> {
		const rows = TASKS.filter((task) => input.done === undefined || task.done === input.done);
		return pageOf(rows, input.cursor, input.limit ?? 100);
	}
}

export class RenameCommand extends ICommand.input(RenameSchema).output(TaskSchema) {
	run(input: { readonly id: string; readonly title: string }): Task {
		return { id: input.id, title: input.title, done: false };
	}
}

export class BrokenTitleQuery extends IQuery.output(z.string()) {
	get(): Promise<string> {
		return Promise.reject(new Error("the title is gone"));
	}
}

export const seen: BoardProps[] = [];

export function BoardView(props: BoardProps): ReactElement {
	seen.push(props);
	const items: readonly Task[] = props.tasksQuery.data.items;
	const title: string = props.titleQuery.data;
	const asked: Task | null = props.taskQuery.data;
	return h("p", { id: "board" }, `${title}: ${items.length} ${asked?.title ?? "none"}`);
}

export function PendingView(): ReactElement {
	return h("i", { id: "pending" }, "reading");
}

export function FailedView({ failures }: FailedViewProps): ReactElement {
	return h("b", { id: "failed" }, failures.join("; "));
}

interface TitleHandle {
	readonly data: string;
	readonly isLoading: boolean;
	readonly failure: string | null;
}

export function NumberTitleView({ titleQuery }: { readonly titleQuery: number }): ReactElement {
	return h("p", null, String(titleQuery));
}

export function ExtraPropView({
	titleQuery,
	extra,
}: {
	readonly titleQuery: TitleHandle;
	readonly extra: number;
}): ReactElement {
	return h("p", null, `${titleQuery.data} ${extra}`);
}

export function TitleView({ titleQuery }: { readonly titleQuery: TitleHandle }): ReactElement {
	return h("p", null, titleQuery.data);
}
