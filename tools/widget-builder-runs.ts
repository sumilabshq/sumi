import { createElement as h } from "react";
import type { ReactElement } from "react";
import { z } from "zod";
import { render } from "../packages/shared/core/src/engine/render.js";
import { inject, widget } from "../packages/shared/core/src/widget-builder.ts";
import { OnRefused } from "../packages/shared/framework/src/command-refusals.ts";
import type { CommandRefusal } from "../packages/shared/framework/src/command-refusals.ts";
import { ICommand } from "../packages/shared/core/src/gateway/queries.ts";
import type { InjectProps } from "../packages/shared/core/src/widget-builder-types.ts";
import { present } from "./page-dom.ts";

type Check = (what: string, got: unknown, wanted: unknown) => void;

const MarkSchema = z.object({ id: z.string() });
const BOOM = "the output check broke";
const ThrowingOutputSchema = z.string().refine(() => {
	throw new Error(BOOM);
});

interface Held {
	readonly done: () => void;
	readonly refuse: (reason: string) => void;
}

const held = new Map<string, Held>();

class HeldCommand extends ICommand.input(MarkSchema) {
	run({ id }: { readonly id: string }): Promise<void> {
		return new Promise((done, refused) =>
			held.set(id, { done: () => done(), refuse: (reason) => refused(new Error(reason)) }),
		);
	}
}

class WritesCommand extends ICommand.input(MarkSchema).output(z.string()) {
	run(): string {
		return "written";
	}
}

const runPorts = inject({ markCommand: ICommand.input(MarkSchema) });
const throwPorts = inject({ markCommand: ICommand.input(MarkSchema).output(ThrowingOutputSchema) });

const drawn: InjectProps<typeof runPorts>[] = [];
const thrown: InjectProps<typeof throwPorts>[] = [];

function RunView(props: InjectProps<typeof runPorts>): ReactElement {
	drawn.push(props);
	return h("p", null, "runs");
}

function ThrowView(props: InjectProps<typeof throwPorts>): ReactElement {
	thrown.push(props);
	return h("p", null, "throws");
}

const Runs = widget().inject(runPorts).render(RunView);
const Throws = widget().inject(throwPorts).render(ThrowView);

function heldRun(id: string): Held {
	return present(held.get(id), `a held run of ${id}`);
}

export async function checkRuns(check: Check, settle: () => Promise<void>): Promise<void> {
	const host = document.createElement("div");
	document.body.append(host);
	const heard: CommandRefusal[] = [];
	const hearing = (child: ReactElement) =>
		h(OnRefused, { value: (refusal: CommandRefusal) => heard.push(refusal) }, child);
	const last = () => present(drawn[drawn.length - 1], "a drawn run view");
	render(hearing(h(Runs, { markCommand: new HeldCommand() })), host);
	await settle();

	const first = last().markCommand.run({ id: "a" });
	const second = last().markCommand.run({ id: "b" });
	await settle();
	heldRun("b").done();
	await second;
	heldRun("a").refuse("a was refused");
	await first;
	await settle();
	check(
		"a run that started earlier and ended last does not write the command's refusal",
		[last().markCommand.refusal, last().markCommand.with({ id: "a" }).refusal],
		[null, "a was refused"],
	);
	const third = last().markCommand.run({ id: "c" });
	const fourth = last().markCommand.run({ id: "d" });
	await settle();
	heldRun("d").refuse("d was refused");
	await fourth;
	heldRun("c").done();
	await third;
	await settle();
	check("the latest started run writes it, whatever ends after", last().markCommand.refusal, "d was refused");

	heard.length = 0;
	const once = last().markCommand.with({ id: "e" }).run();
	await settle();
	const twice = await Promise.race([last().markCommand.with({ id: "e" }).run(), settle().then(() => "still running")]);
	check(
		"a second run of one input while it runs is refused to the caller alone",
		[twice, heard.length, last().markCommand.with({ id: "e" }).refusal],
		[{ ok: false, reason: "markCommand is already running", ran: false }, 0, null],
	);
	heldRun("e").done();
	await once;
	await settle();

	const boundBefore = last().markCommand.with({ id: "e" }).run;
	const keptBefore = last().markCommand.with({ id: "a" }).run;
	render(hearing(h(Runs, { markCommand: new HeldCommand() })), host);
	await settle();
	render(hearing(h(Runs, { markCommand: new HeldCommand() })), host);
	await settle();
	check(
		"an input whose run ended clean is forgotten, one holding a refusal is kept",
		[last().markCommand.with({ id: "e" }).run === boundBefore, last().markCommand.with({ id: "a" }).run === keptBefore],
		[false, true],
	);

	heard.length = 0;
	render(hearing(h(Throws, { markCommand: new WritesCommand() })), host);
	await settle();
	const afterWrite = await present(thrown[thrown.length - 1], "a drawn throw view").markCommand.run({ id: "t" });
	await settle();
	check(
		"a throw after the write answers ran: true and reaches the one refusal handler",
		[afterWrite, heard.map(({ ran }) => ran)],
		[{ ok: false, reason: BOOM, ran: true }, [true]],
	);
	render(null, host);
}
