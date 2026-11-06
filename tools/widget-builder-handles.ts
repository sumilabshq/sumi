import { createElement as h } from "react";
import type { ReactElement } from "react";
import { z } from "zod";
import { render } from "../packages/shared/core/src/engine/render.js";
import { inject, widget } from "../packages/shared/core/src/widget-builder.ts";
import { OnRefused } from "../packages/shared/data-framework/src/command-refusals.ts";
import { ICommand, IQuery } from "../packages/shared/core/src/gateway/queries.ts";
import { PageInputSchema, PageOf, pageAt } from "../packages/shared/core/src/gateway/page.ts";
import type { CanResult } from "../packages/shared/data-framework/src/gateway/contract.ts";
import { useCommand } from "../packages/shared/core/src/use-command.ts";
import { useQuery } from "../packages/shared/core/src/use-query.ts";
import type { InjectProps } from "../packages/shared/core/src/widget-builder-types.ts";
import { present } from "./page-dom.ts";

type Check = (what: string, got: unknown, wanted: unknown) => void;

const MarkSchema = z.object({ id: z.string() });
const RowSchema = z.object({ id: z.string() });

const markPorts = inject({ markCommand: ICommand.input(MarkSchema) });

type MarkProps = InjectProps<typeof markPorts>;

const settles = new Map<string, () => void>();

class MarkCommand extends ICommand.input(MarkSchema) {
	run({ id }: { readonly id: string }): Promise<void> {
		if (id === "refused") return Promise.reject(new Error("nothing to mark"));
		return new Promise((settled) => settles.set(id, settled));
	}
}

class LockedCommand extends ICommand.input(MarkSchema) {
	can(): CanResult {
		return { can: false, reason: "the board is locked" };
	}

	run(): void {}
}

class HeadingQuery extends IQuery.output(z.string().default("Heading")) {
	get(): string {
		return "Read";
	}
}

class RowsQuery extends IQuery.input(PageInputSchema).output(PageOf(RowSchema)) {
	query(): ReturnType<typeof pageAt<{ readonly id: string }>> {
		return pageAt([{ id: "r1" }, { id: "r2" }], 0, 2);
	}
}

const HEADING = new HeadingQuery();
const ROWS = new RowsQuery();

const drawn: MarkProps[] = [];
const Mark = widget().inject(markPorts).render(MarkView);

function MarkView(props: MarkProps): ReactElement {
	drawn.push(props);
	return h("p", null, "marks");
}

const plain: { command?: ReturnType<typeof useCommand<MarkCommand>>; heading?: unknown; rows?: unknown }[] = [];

function PlainView({ command }: { readonly command: MarkCommand }): ReactElement {
	const handle = useCommand(command);
	const heading = useQuery(HEADING);
	const rows = useQuery(ROWS);
	plain.push({ command: handle, heading: heading.data, rows: rows.data.items.map((row) => row.id) });
	return h("p", null, heading.data);
}

export async function checkHandles(check: Check, settle: () => Promise<void>): Promise<void> {
	const host = document.createElement("div");
	document.body.append(host);
	const last = () => present(drawn[drawn.length - 1], "a drawn mark view");
	render(h(OnRefused, { value: () => undefined }, h(Mark, { markCommand: new MarkCommand() })), host);
	await settle();
	const runningA = last().markCommand.with({ id: "a" }).run();
	await settle();
	const stateOf = (id: string) => {
		const one = last().markCommand.with({ id });
		return [one.isRunning, one.refusal];
	};
	check(
		"two inputs run apart: one running, the other not, the whole command running",
		[stateOf("a"), stateOf("b"), last().markCommand.isRunning],
		[[true, null], [false, null], true],
	);
	check(
		"an equal input in one render gives equal state and the same run",
		last().markCommand.with({ id: "a" }).run === last().markCommand.with({ id: "a" }).run,
		true,
	);
	await last().markCommand.with({ id: "refused" }).run();
	settles.get("a")?.();
	await runningA;
	await settle();
	check(
		"a refusal belongs to its own input, and the command's is its latest started run's",
		[stateOf("a"), stateOf("refused"), last().markCommand.refusal],
		[[false, null], [false, "nothing to mark"], "nothing to mark"],
	);
	render(h(OnRefused, { value: () => undefined }, h(Mark, { markCommand: new LockedCommand() })), host);
	await settle();
	const locked = last().markCommand;
	check(
		"can false reaches the handle and every bound input",
		[locked.can, locked.cannotBecause, locked.with({ id: "x" }).can],
		[false, "the board is locked", false],
	);
	render(h(OnRefused, { value: () => undefined }, h(PlainView, { command: new MarkCommand() })), host);
	await settle();
	const seen = present(plain[plain.length - 1], "a plain view");
	check(
		"plain React gets the same handles from useQuery and useCommand",
		[Object.keys(present(seen.command, "a command handle")).sort(), seen.heading, seen.rows],
		[Object.keys(last().markCommand).sort(), "Read", ["r1", "r2"]],
	);
	const plainRun = present(seen.command, "a command handle").with({ id: "p" }).run();
	await settle();
	check(
		"and its bound input runs apart too",
		present(plain[plain.length - 1]?.command, "a command handle").with({ id: "p" }).isRunning,
		true,
	);
	settles.get("p")?.();
	await plainRun;
	render(null, host);
}
