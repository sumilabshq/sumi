import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { check, tally } from "./check-helpers.ts";
import { layoutRefusalsOf } from "./plugin-layout.ts";

type Files = Readonly<Record<string, string>>;

const GOOD: Files = {
	"package.json": '{ "widgetarium": { "level": "plugin" } }',
	"src/plugin.ts":
		'import { plugin } from "x";\nimport { NotesSlot } from "./slots.js";\nexport const NotesPlugin = plugin("notes").declare(NotesSlot);\n',
	"src/slots.ts": 'import { slot } from "x";\nexport const NotesSlot = slot("notes").item(schema).list();\n',
	"src/index.ts": 'export * from "./slots.js";\nexport * from "./plugin.js";\n',
	"data/notes/package.json": '{ "widgetarium": { "level": "domain" } }',
	"data/notes/module.ts": "export const NotesModule = 1;\n",
};

function refusalsOf(files: Files): readonly string[] {
	const root = mkdtempSync(path.join(tmpdir(), "wg-plugin-layout-"));

	for (const [relative, text] of Object.entries(files)) {
		const file = path.join(root, "notes", relative);
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(file, text);
	}

	const refusals = layoutRefusalsOf(root);
	rmSync(root, { recursive: true, force: true });
	return refusals;
}

function without(files: Files, removed: string): Files {
	return Object.fromEntries(Object.entries(files).filter(([relative]) => !relative.startsWith(removed)));
}

check("every plugin in plugins/ follows the layout", layoutRefusalsOf("plugins"), []);
check("a plugin laid out by the rule passes", refusalsOf(GOOD), []);
check(
	"a plugin with no slots and no modules needs neither slots.ts nor data/",
	refusalsOf({
		"package.json": "{}",
		"src/plugin.ts": 'import { plugin } from "x";\nexport const NotesPlugin = plugin("notes");\n',
		"src/index.ts": 'export * from "./plugin.js";\n',
	}),
	[],
);
check("a plugin without src/plugin.ts is refused", refusalsOf(without(GOOD, "src/plugin.ts")), [
	"plugins/notes/src/plugin.ts: missing; every plugin defines itself there",
]);
check(
	"a helper beside the plugin definition is refused",
	refusalsOf({ ...GOOD, "src/plugin.ts": `${GOOD["src/plugin.ts"] ?? ""}function helper() {}\n` }),
	["plugins/notes/src/plugin.ts:4: FunctionDeclaration beside the plugin definition; move it to its own file"],
);
check(
	"a slot declared outside slots.ts is refused",
	refusalsOf({
		...GOOD,
		"src/extra.ts": 'import { slot } from "x";\nexport const ExtraSlot = slot("extra").item(schema);\n',
	}),
	["plugins/notes/src/extra.ts: slot(...) outside src/slots.ts"],
);
check(
	"an index that does more than re-export is refused",
	refusalsOf({ ...GOOD, "src/index.ts": 'export * from "./plugin.js";\nexport const Extra = 1;\n' }),
	["plugins/notes/src/index.ts:2: ExportNamedDeclaration; the entry only re-exports"],
);
check(
	"a module outside data/<module>/ is refused",
	refusalsOf({
		...without(GOOD, "data/"),
		"module/package.json": '{ "widgetarium": { "level": "domain" } }',
		"module/module.ts": "export const M = 1;\n",
	}),
	[
		"plugins/notes/module: a plugin holds only src/, data/, package.json, tsconfig.json and LICENSE",
		"plugins/notes/module/module.ts: a module lives only in data/<module>/",
		"plugins/notes/module/package.json: a module lives only in data/<module>/",
	],
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("plugin layout: all checks passed");
