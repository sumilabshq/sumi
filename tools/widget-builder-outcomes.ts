import { createElement as h } from "react";
import type { ReactElement } from "react";
import { z } from "zod";
import { toast } from "@widgetarium/kit";
import { render } from "../packages/core/src/engine/render.js";
import { inject, widget } from "../packages/core/src/widget-builder.ts";
import { OnRefused } from "../packages/core/src/command-refusals.ts";
import type { CommandRefusal } from "../packages/core/src/command-refusals.ts";
import { ICommand, IQuery } from "../packages/core/src/gateway/queries.ts";
import { implementationOfFunction } from "../packages/core/src/gateway/function-handler.ts";
import { declarationIn } from "../packages/core/src/gateway/declared.ts";
import { stableKey } from "../packages/core/src/gateway/stable-key.ts";
import type { InjectProps } from "../packages/core/src/widget-builder-types.ts";
import { present } from "./page-dom.ts";

type Check = (what: string, got: unknown, wanted: unknown) => void;

const SaveSchema = z.object({ title: z.string().min(1) });

const savePorts = inject({ titleQuery: IQuery.output(z.string()), saveCommand: ICommand.input(SaveSchema) });

type SaveProps = InjectProps<typeof savePorts>;

const drawn: SaveProps[] = [];

const Save = widget().inject(savePorts).render(SaveView);
const Throwing = widget().inject(savePorts).render(ThrowingView);

export async function checkOutcomes(check: Check, settle: () => Promise<void>): Promise<void> {
	const host = document.createElement("div");
	document.body.append(host);
	const last = () => present(drawn[drawn.length - 1], "a drawn save view");
	const said = captureConsole();

	// @ts-expect-error a builder widget drawn without one of its handlers does not compile
	render(h(Save, { titleQuery: "Draft" }), host);
	await settle();
	check("a forgotten command answers not given", await last().saveCommand.run({ title: "x" }), {
		ok: false,
		reason: "saveCommand is not given",
		ran: false,
	});
	check(
		"and says so as an error",
		said.errors.some((line) => line.includes("saveCommand is not given")),
		true,
	);

	const heard: CommandRefusal[] = [];
	const toastsBefore = toast.getToasts().length;
	render(
		h(
			OnRefused,
			{ value: (refusal: CommandRefusal) => heard.push(refusal) },
			h(Save, { titleQuery: "Draft", saveCommand: new RefusingSave() }),
		),
		host,
	);
	await settle();
	await last().saveCommand.run({ title: "x" });
	await settle();
	check(
		"a refusal reaches the app's handler once, with name, reason and ran",
		heard.map(({ name, ran }) => [name, ran]),
		[["saveCommand", false]],
	);
	check("the view may read the last refusal on the command", last().saveCommand.refusal, heard[0]?.reason);
	check("and the app's handler stands in for the toast", toast.getToasts().length, toastsBefore);

	render(h(Save, { titleQuery: "Draft", saveCommand: new RefusingSave() }), host);
	await settle();
	await last().saveCommand.run({ title: "x" });
	check("with no handler set a refusal is toasted", toast.getToasts().length, toastsBefore + 1);
	check(
		"each of the three refusals is logged once, where commands answer",
		said.warnings.filter((line) => line.includes("saveCommand refused")).length,
		3,
	);

	render(
		h(
			"div",
			null,
			h(Throwing, { titleQuery: "Broken", saveCommand: () => undefined }),
			h(Save, { titleQuery: "Sibling", saveCommand: () => undefined }),
		),
		host,
	);
	await settle();
	check(
		"a view that throws draws the failed notice, and its sibling still draws",
		[
			host.querySelector("[data-wg-view-failed]")?.textContent?.includes("the view broke"),
			host.querySelector(".saved")?.textContent,
		],
		[true, "Sibling"],
	);
	check(
		"and the throw is logged",
		said.errors.some((line) => line.includes("a view threw while drawing")),
		true,
	);
	said.restore();
	render(null, host);
	checkKeys(check);
}

function checkKeys(check: Check): void {
	const declaration = present(declarationIn(savePorts.titleQuery), "the title declaration");
	const answer = (): string => "same";
	check(
		"one function is wrapped once, so its gateway keeps its id",
		implementationOfFunction(declaration, answer) === implementationOfFunction(declaration, answer),
		true,
	);
	const one = new Map([["a", 1]]);
	const cyclic: { self?: unknown } = {};
	cyclic.self = cyclic;
	check(
		"a value with its own prototype is keyed by identity, and a cycle is keyed without a loop",
		[
			stableKey({ held: one }) === stableKey({ held: one }),
			stableKey({ held: one }) === stableKey({ held: new Map() }),
			typeof stableKey(cyclic),
		],
		[true, false, "string"],
	);
}

function captureConsole() {
	const errors: string[] = [];
	const warnings: string[] = [];
	const { error, warn } = console;
	console.error = (...said: unknown[]) => void errors.push(said.map(String).join(" "));
	console.warn = (...said: unknown[]) => void warnings.push(said.map(String).join(" "));
	return {
		errors,
		warnings,
		restore: () => Object.assign(console, { error, warn }),
	};
}

function SaveView(props: SaveProps): ReactElement {
	drawn.push(props);
	return h("p", { className: "saved" }, props.titleQuery.data);
}

function ThrowingView(_props: SaveProps): ReactElement {
	throw new Error("the view broke");
}

class RefusingSave extends ICommand.input(SaveSchema) {
	run(): void {
		throw new Error("the disk is full");
	}
}
