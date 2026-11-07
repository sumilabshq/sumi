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
	"src/features/list/ui/note-list/note-list.tsx":
		'import { useNotes } from "../../lib/use-notes.js";\nimport { NoteCard } from "../../../card/ui/note-card/note-card.js";\nimport { titleOf } from "../../../../shared/lib/title-of.js";\nexport const NoteList = 1;\n',
	"src/features/list/ui/note-list/note-list.css": ".notes {}\n",
	"src/features/list/lib/use-notes.ts": "export const useNotes = 1;\n",
	"src/features/card/ui/note-card/note-card.tsx": "export const NoteCard = 1;\n",
	"src/shared/lib/title-of.ts": "export const titleOf = 1;\n",
	"src/shared/ui/note-mark/note-mark.tsx": "export const NoteMark = 1;\n",
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
		"src/features/list/lib/extra.ts":
			'import { slot } from "x";\nexport const ExtraSlot = slot("extra").item(schema);\n',
	}),
	["plugins/notes/src/features/list/lib/extra.ts: slot(...) outside src/slots.ts"],
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

check(
	"a loose file at the top of src is refused",
	refusalsOf({ ...GOOD, "src/helper.ts": "export const helper = 1;\n" }),
	["plugins/notes/src/helper.ts: no other loose file at the top of src; it goes to features/<feature>/ or shared/"],
);
check(
	"a folder at the top of src other than features/ and shared/ is refused",
	refusalsOf({ ...GOOD, "src/ui/view/view.tsx": "export const View = 1;\n" }),
	["plugins/notes/src/ui: no other loose file at the top of src; it goes to features/<feature>/ or shared/"],
);
check(
	"a file loose in features/ is refused",
	refusalsOf({ ...GOOD, "src/features/list.ts": "export const list = 1;\n" }),
	["plugins/notes/src/features/list.ts: features/ holds only feature folders"],
);
check(
	"a feature holding anything but ui/ and lib/ is refused, a sheet included",
	refusalsOf({ ...GOOD, "src/features/list/list.css": ".list {}\n" }),
	["plugins/notes/src/features/list/list.css: a feature or shared/ holds only ui/ and lib/"],
);
check(
	"shared/ holding anything but ui/ and lib/ is refused",
	refusalsOf({ ...GOOD, "src/shared/schema/note.ts": "export const Note = 1;\n" }),
	["plugins/notes/src/shared/schema: a feature or shared/ holds only ui/ and lib/"],
);
check(
	"a .tsx loose in ui/, outside a block folder, is refused",
	refusalsOf({ ...GOOD, "src/features/list/ui/note-list.tsx": "export const NoteList = 1;\n" }),
	["plugins/notes/src/features/list/ui/note-list.tsx: ui/ holds only block folders, ui/<block>/"],
);
check(
	"a .ts in a block folder is refused",
	refusalsOf({ ...GOOD, "src/features/list/ui/note-list/use-rows.ts": "export const useRows = 1;\n" }),
	["plugins/notes/src/features/list/ui/note-list/use-rows.ts: a block folder holds only its .tsx and the .css it uses"],
);
check(
	"a .tsx in lib/ is refused",
	refusalsOf({ ...GOOD, "src/shared/lib/row.tsx": "export const Row = 1;\n" }),
	["plugins/notes/src/shared/lib/row.tsx: lib/ holds only .ts files, no folder, no .tsx, no .css"],
);
check(
	"a folder in lib/ is refused",
	refusalsOf({ ...GOOD, "src/features/list/lib/scene/paths.ts": "export const paths = 1;\n" }),
	["plugins/notes/src/features/list/lib/scene: lib/ holds only .ts files, no folder, no .tsx, no .css"],
);
check(
	"a feature importing another feature's lib/ is refused, statically or lazily",
	refusalsOf({
		...GOOD,
		"src/features/card/ui/note-card/note-card.tsx":
			'import { useNotes } from "../../../list/lib/use-notes.js";\nexport const NoteCard = () => import("../../../list/lib/use-notes.js");\n',
	}),
	[
		"plugins/notes/src/features/card/ui/note-card/note-card.tsx:1: imports ../../../list/lib/use-notes.js; a feature's lib/ is its own; what two features use goes to shared/lib/",
		"plugins/notes/src/features/card/ui/note-card/note-card.tsx:2: imports ../../../list/lib/use-notes.js; a feature's lib/ is its own; what two features use goes to shared/lib/",
	],
);
check(
	"shared/ importing a feature's lib/ is refused",
	refusalsOf({
		...GOOD,
		"src/shared/lib/title-of.ts": 'export { useNotes } from "../../features/list/lib/use-notes.js";\n',
	}),
	[
		"plugins/notes/src/shared/lib/title-of.ts:1: imports ../../features/list/lib/use-notes.js; a feature's lib/ is its own; what two features use goes to shared/lib/",
	],
);
check(
	"plugin.ts may import any feature's lib/",
	refusalsOf({
		...GOOD,
		"src/plugin.ts": `import { useNotes } from "./features/list/lib/use-notes.js";\n${GOOD["src/plugin.ts"] ?? ""}`,
	}),
	[],
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("plugin layout: all checks passed");
