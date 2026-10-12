import { access, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Told } from "./shape-command.js";

const WIDGET_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const NOT_A_NAME = "{name} is not a widget name. Name it in lowercase words joined by hyphens: task-list.";
const NOT_A_KIND = "Say what to make: new widget <name>.";
const ALREADY_THERE = "{path} is already there, so nothing was written.";
const WROTE = "Wrote {widget} and {view}. Rename itemsQuery and openCommand to what the widget reads and does.";

interface Written {
	readonly widget: string;
	readonly view: string;
}

export interface NewWidgetAsk {
	readonly _: readonly string[];
	readonly [flag: string]: unknown;
}

export function newWidgetAsked(kind: string | undefined, asked: NewWidgetAsk): Promise<Told<Written>> {
	const dir = typeof asked["dir"] === "string" ? asked["dir"] : process.cwd();
	return newWidgetOf(kind, asked._[2], dir);
}

async function newWidgetOf(kind: string | undefined, name: string | undefined, dir: string): Promise<Told<Written>> {
	if (kind !== "widget" || name === undefined) return { refusal: NOT_A_KIND };
	if (!WIDGET_NAME.test(name)) return { refusal: NOT_A_NAME.replace("{name}", name) };
	const widget = join(resolve(dir), "widgets", `${name}.widget.ts`);
	const view = join(resolve(dir), "ui", name, `${name}.tsx`);
	const taken = await firstTaken([widget, view]);
	if (taken !== null) return { refusal: ALREADY_THERE.replace("{path}", taken) };
	const camel = camelOf(name);
	await mkdir(join(resolve(dir), "widgets"), { recursive: true });
	await mkdir(join(resolve(dir), "ui", name), { recursive: true });
	await writeFile(widget, widgetSourceOf(name, camel));
	await writeFile(view, viewSourceOf(name, camel));
	return { value: { widget, view }, text: WROTE.replace("{widget}", widget).replace("{view}", view) };
}

function widgetSourceOf(name: string, camel: string): string {
	const pascal = `${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
	return `import { ICommand, IQuery, PageInputSchema, PageOf, inject, widget } from "widgetarium";
import { z } from "zod";
import { ${pascal}View } from "../ui/${name}/${name}.js";

const ItemSchema = z.object({ id: z.string(), title: z.string() });

export const ${camel}Inject = inject({
	itemsQuery: IQuery.input(PageInputSchema).output(PageOf(ItemSchema)),
	openCommand: ICommand.input(ItemSchema.pick({ id: true })),
});

export const ${pascal} = widget()
	.inject(${camel}Inject)
	.states({ Full: { itemsQuery: [{ id: "1", title: "First item" }] }, Empty: { itemsQuery: [] } })
	.render(${pascal}View);
`;
}

function viewSourceOf(name: string, camel: string): string {
	const pascal = `${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
	return `import type { ReactElement } from "react";
import type { InjectProps } from "widgetarium";
import type { ${camel}Inject } from "../../widgets/${name}.widget.js";

export function ${pascal}View({ itemsQuery, openCommand }: InjectProps<typeof ${camel}Inject>): ReactElement {
	return (
		<ul>
			{itemsQuery.data.items.map((item) => {
				const open = openCommand.with({ id: item.id });
				return (
					<li key={item.id}>
						<button type="button" disabled={!open.can || open.isRunning} onClick={() => void open.run()}>
							{item.title}
						</button>
						{open.refusal ? <span>{open.refusal}</span> : null}
					</li>
				);
			})}
			{itemsQuery.hasMore ? (
				<button type="button" onClick={() => itemsQuery.more()}>
					More
				</button>
			) : null}
		</ul>
	);
}
`;
}

function camelOf(name: string): string {
	return name.replace(/-([a-z0-9])/g, (_match, letter: string) => letter.toUpperCase());
}

async function firstTaken(paths: readonly string[]): Promise<string | null> {
	for (const path of paths) {
		const isThere = await access(path).then(
			() => true,
			() => false,
		);
		if (isThere) return path;
	}
	return null;
}
