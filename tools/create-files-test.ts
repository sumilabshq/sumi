import { spawnSync } from "node:child_process";
import fs from "node:fs";
import * as fileSystem from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	nodeProjectFiles,
	projectConfigJsonSchema,
	readProjectConfig,
} from "../packages/shared/core/src/project/index.js";
import { runCli } from "../packages/shared/cli/src/run-cli.js";
import { HANDBOOK_PAGES } from "../packages/shared/cli/src/handbook-copy.js";
import type { CliOutput } from "../packages/shared/cli/src/cli-output.js";
import { z } from "zod";
import { fieldOf } from "./export-source.mts";
import { fakeEngine } from "./fake-engine.ts";
import {
	COMPONENTS,
	KIT_FOLDER,
	collidingPartsRefusal,
	componentNamesIn,
	filesIn,
	kitBytesIn,
	kitFilesIn,
	kitModulesInRepo,
	missingFromMerged,
	exportsInRepoOf,
} from "./merged-kit-probe.ts";

interface CliRun {
	readonly code: number;
	readonly said: string;
}

const REPO = path.resolve(import.meta.dirname, "..");
const SCHEMA_FILE = path.join(REPO, "packages/shared/cli/widgetarium.schema.json");
const TEMPLATE_MANIFEST = path.join(REPO, "packages/shared/cli/templates/project/package.json");
const PRETTIER = path.join(REPO, "node_modules/.bin/prettier");
const WRITE_SCHEMA = process.argv.includes("--write-schema");
const HANDBOOK_FOLDER = "docs/widgetarium";
const UNFILLED = /\{(?:name|package|handbook|paths\.[a-z]+|design\.[a-z]+)\}/;
const RecordSchema = z.record(z.string(), z.unknown()).catch({});
const ICON = "public/icon.svg";
const DUPLICATE_WIDGET = 'widget id "tasks" is declared 2 times';
const SHELL_FILE = /chrome|corner|studio/i;
const WIDGETARIUM_IMPORT = /import\s+(?:[^";]*?from\s+)?"((?:virtual:)?widgetarium[^"]*)"/g;

const PRETTIER_IGNORED = ["dist", "emoji-table.ts", "generated", "icon-table.ts", "node_modules"];
const VALIDATION_SCRIPTS = {
	format: "prettier --write .",
	"format:check": "prettier --check .",
	check: "npm run lint && npm run format:check && npm run typecheck && widgetarium check",
};

const EXPECTED_FILES = [
	".gitignore",
	".prettierignore",
	"AGENTS.md",
	"CLAUDE.md",
	"docs/design-system/DESIGN.md",
	"docs/design-system/USAGE.md",
	"docs/references/.gitkeep",
	"eslint.config.js",
	"index.html",
	"package.json",
	ICON,
	"src/app/routes/board.json",
	"src/logic/.gitkeep",
	"src/main.tsx",
	"src/shared/libs/.gitkeep",
	"src/shared/schemas/.gitkeep",
	"src/shared/sources/.gitkeep",
	"src/styles.css",
	"src/styles/tokens.css",
	"src/widgets/.gitkeep",
	"tsconfig.json",
	"tsconfig.node.json",
	"vendor/engine/widgetarium-cli-0.1.0.tgz",
	"vendor/engine/widgetarium-core-0.1.0.tgz",
	"vendor/engine/widgetarium-eslint-plugin-0.1.0.tgz",
	"vendor/engine/widgetarium-kit-0.1.0.tgz",
	"vendor/engine/widgetarium-vite-0.1.0.tgz",
	"vite.config.ts",
	"widgetarium.json",
];

let failures = 0;

function check(name: string, held: unknown, wanted: unknown): void {
	const same = JSON.stringify(held) === JSON.stringify(wanted);
	if (!same) failures += 1;
	console.log(
		`${same ? "ok  " : "not ok"} ${name}${same ? "" : `\n      held   ${JSON.stringify(held)}\n      wanted ${JSON.stringify(wanted)}`}`,
	);
}

function widgetariumImportsIn(source: string): string[] {
	return [...source.matchAll(WIDGETARIUM_IMPORT)].map(([, specifier]) => specifier ?? "").sort();
}

async function cli(argv: readonly string[]): Promise<CliRun> {
	const lines: string[] = [];
	const output: CliOutput = { out: (text) => lines.push(text), err: (text) => lines.push(text) };
	const code = await runCli(argv, output);
	return { code, said: lines.join("\n") };
}

function systemFile(system: string, file: string): string {
	return fs.readFileSync(path.join(REPO, "design-systems", system, file), "utf8");
}

function agentReadOrderIn(agents: string): string[] {
	const look = agents.slice(agents.indexOf("## The look"));
	return [...new Set([...look.matchAll(/(USAGE\.md|DESIGN\.md|src\/styles\/tokens\.css)/g)].map(([found]) => found))];
}

function jsonAt(at: string): unknown {
	return JSON.parse(fs.readFileSync(at, "utf8"));
}

function versionInRepo(name: string): string {
	return String(fieldOf(jsonAt(path.join(REPO, "node_modules", name, "package.json")), "version"));
}

function templateDriftFrom(): string[] {
	const template = jsonAt(TEMPLATE_MANIFEST);
	const runtime = fieldOf(template, "dependencies");
	const tools = fieldOf(template, "devDependencies");
	const declared = {
		...RecordSchema.parse(fieldOf(jsonAt(path.join(REPO, "packages/shared/kit/package.json")), "dependencies")),
		...RecordSchema.parse(fieldOf(jsonAt(path.join(REPO, "apps/studio/package.json")), "peerDependencies")),
	};
	const runtimeDrift = Object.entries(declared).filter(([name, range]) => fieldOf(runtime, name) !== range);
	const toolDrift = ["typescript", "@types/react", "@types/react-dom", "@types/node"].filter(
		(name) => fieldOf(tools, name) !== `^${versionInRepo(name)}`,
	);
	return [...runtimeDrift.map(([name]) => name), ...toolDrift];
}

function schemaText(): string {
	return `${JSON.stringify(projectConfigJsonSchema(), null, "\t")}\n`;
}

if (WRITE_SCHEMA) fs.writeFileSync(SCHEMA_FILE, schemaText());

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "wg-create-files-"));
const project = path.join(scratch, "shop");
const engine = fakeEngine(path.join(scratch, "engine"));
try {
	const created = await cli(["create", project, "--engine", engine, "--no-install", "--no-git"]);
	check(
		"create answers 0 and says where",
		[created.code, created.said.includes(`created shop in ${project}`)],
		[0, true],
	);

	const files = filesIn(project);
	const outsideCopies = files.filter((at) => !at.startsWith(`${KIT_FOLDER}/`) && !at.startsWith(`${HANDBOOK_FOLDER}/`));
	check("create writes exactly the expected files beside the kit and the handbook", outsideCopies, EXPECTED_FILES);
	check(
		"a created project lays no chrome, corner or studio widget",
		files.filter((at) => SHELL_FILE.test(at)),
		[],
	);
	check(
		"main.tsx starts through virtual:widgetarium/start alone",
		widgetariumImportsIn(fs.readFileSync(path.join(project, "src/main.tsx"), "utf8")),
		["virtual:widgetarium/project", "virtual:widgetarium/start"],
	);
	const kitFiles = kitFilesIn(project);
	const components = componentNamesIn(kitFiles);
	const repoComponents = componentNamesIn(kitModulesInRepo());
	console.log(`     kit component files: ${repoComponents.length} in the repo, ${components.length} in the project`);
	check(
		"every kit module outside components/ is copied, and the theme, no dot-folder",
		kitFiles.filter((at) => !at.startsWith(COMPONENTS)),
		[...kitModulesInRepo().filter((at) => !at.startsWith(COMPONENTS)), "theme.css"].sort(),
	);
	check(
		"every component of the repo lands in the project file named for it or for a root it extends",
		repoComponents.filter((name) => !components.some((file) => file === name || name.startsWith(`${file}-`))),
		[],
	);
	check(
		"the calendar is one calendar.tsx exporting Calendar and every part, with no calendar-* file beside it",
		[
			components.filter((name) => name.startsWith("calendar")),
			missingFromMerged(project, "calendar.tsx", ["Calendar", ...exportsInRepoOf("calendar")]),
		],
		[["calendar"], []],
	);
	check(
		"button-group.tsx holds its separator and text, button.tsx its mark and skeleton",
		[
			missingFromMerged(project, "button-group.tsx", exportsInRepoOf("button-group")),
			missingFromMerged(project, "button.tsx", ["button-mark", "button-skeleton"].flatMap(exportsInRepoOf)),
			components.filter((name) => name.startsWith("button-group-")),
		],
		[[], [], []],
	);
	check(
		"the handbook holds the pages that apply to a project",
		files.filter((at) => at.startsWith(`${HANDBOOK_FOLDER}/`)).map((at) => path.basename(at)),
		[...HANDBOOK_PAGES].sort(),
	);
	check(
		"no placeholder is left unfilled outside the handbook",
		outsideCopies.filter(
			(at) => !at.endsWith(".tgz") && UNFILLED.test(fs.readFileSync(path.join(project, at), "utf8")),
		),
		[],
	);

	const manifest = jsonAt(path.join(project, "package.json"));
	check("package.json is named after the folder", fieldOf(manifest, "name"), "shop");
	const scripts = RecordSchema.parse(fieldOf(manifest, "scripts"));
	check(
		"generate is a script, and dev, studio and build run it first",
		["generate", "dev", "studio", "build"].map((name) => String(scripts[name]).startsWith("widgetarium generate")),
		[true, true, true, true],
	);
	check(
		"the engine is the vendored closure of the CLI and the Vite plugin, and only it",
		Object.entries(RecordSchema.parse(fieldOf(manifest, "dependencies"))).filter(([, spec]) =>
			String(spec).startsWith("file:"),
		),
		[
			["@widgetarium/cli", "file:vendor/engine/widgetarium-cli-0.1.0.tgz"],
			["@widgetarium/core", "file:vendor/engine/widgetarium-core-0.1.0.tgz"],
			["@widgetarium/eslint-plugin", "file:vendor/engine/widgetarium-eslint-plugin-0.1.0.tgz"],
			["@widgetarium/kit", "file:vendor/engine/widgetarium-kit-0.1.0.tgz"],
			["@widgetarium/vite", "file:vendor/engine/widgetarium-vite-0.1.0.tgz"],
		],
	);

	const reading = await readProjectConfig(nodeProjectFiles(project, fileSystem));
	const aliases = "config" in reading ? reading.config.aliases : {};
	check("widgetarium.json reads back and names the icon", "config" in reading && reading.config.app.icon, ICON);
	check(
		"every alias in widgetarium.json names a file or folder the project holds",
		Object.entries(aliases).filter(([, at]) => !fs.existsSync(path.join(project, at))),
		[],
	);
	const paths = fieldOf(fieldOf(jsonAt(path.join(project, "tsconfig.json")), "compilerOptions"), "paths");
	check(
		"tsconfig maps the kit and the layer aliases",
		[fieldOf(paths, "@widgetarium/kit"), fieldOf(paths, "@widgetarium/kit/surface"), fieldOf(paths, "@kit/*")],
		[["./src/shared/kit/index.ts"], ["./src/shared/kit/utils/surface.ts"], ["./src/shared/kit/*"]],
	);

	check("the template's versions are the repo's", templateDriftFrom(), []);
	check(
		"format, format:check and check run lint, then format:check, then typecheck",
		[scripts["format"], scripts["format:check"], scripts["check"]],
		[VALIDATION_SCRIPTS.format, VALIDATION_SCRIPTS["format:check"], VALIDATION_SCRIPTS.check],
	);
	check(
		"prettier is pinned to the repo's exact version and formats with the repo's settings",
		[fieldOf(fieldOf(manifest, "devDependencies"), "prettier"), fieldOf(manifest, "prettier")],
		[versionInRepo("prettier"), fieldOf(jsonAt(path.join(REPO, "package.json")), "prettier")],
	);
	check(
		".prettierignore keeps build output, generated entries, the kit's generated tables and dependencies out",
		fs.readFileSync(path.join(project, ".prettierignore"), "utf8").split("\n").filter(Boolean).sort(),
		PRETTIER_IGNORED,
	);
	check(
		"widgetarium.schema.json is projectConfigJsonSchema (regenerate with --write-schema)",
		JSON.stringify(jsonAt(SCHEMA_FILE)),
		JSON.stringify(projectConfigJsonSchema()),
	);

	check(
		"prettier finds every file of a created project formatted",
		spawnSync(PRETTIER, ["--list-different", "."], { cwd: project, encoding: "utf8" })
			.stdout.split("\n")
			.filter(Boolean),
		[],
	);

	const clean = await cli(["check", project]);
	check("check finds nothing in a created project", clean.code, 0);
	for (const feature of ["orders", "billing"]) {
		fs.mkdirSync(path.join(project, "src/widgets", feature, "tasks"), { recursive: true });
		fs.writeFileSync(path.join(project, "src/widgets", feature, "tasks/widget.tsx"), "export default 1;\n");
	}
	const planted = await cli(["check", project]);
	check(
		"and finds a duplicate widget planted in it",
		[planted.code, planted.said.includes(DUPLICATE_WIDGET)],
		[1, true],
	);

	check(
		"a name two parts of one component both declare is refused, not merged",
		collidingPartsRefusal(),
		"the kit cannot be merged into one file per component: components/dial.ts declares SIZE, which components/dial-face.ts declares too, in dial",
	);
	const twin = path.join(scratch, "twin");
	await cli(["create", twin, "--engine", engine, "--no-install", "--no-git"]);
	check("the merged kit is the same bytes on a second create", kitBytesIn(twin), kitBytesIn(project));

	const again = await cli(["create", project, "--engine", engine, "--no-install", "--no-git"]);
	check("create refuses a folder that is not empty", [again.code, again.said.includes("is not empty")], [1, true]);
	const coreless = await cli([
		"create",
		path.join(scratch, "coreless"),
		"--engine",
		fakeEngine(path.join(scratch, "coreless-engine"), "@widgetarium/core"),
		"--no-install",
		"--no-git",
	]);
	check(
		"create refuses an engine folder missing part of the closure",
		[coreless.code, coreless.said.includes("holds no tarball for @widgetarium/core")],
		[1, true],
	);
	const badName = await cli(["create", path.join(scratch, "My App"), "--engine", engine, "--no-install", "--no-git"]);
	check("create refuses a folder name npm would refuse", [badName.code, badName.said.includes("--name")], [1, true]);
	check("help answers 0", (await cli(["--help"])).code, 0);

	check(
		"a created app holds the default system's tokens and names it",
		[
			fs.readFileSync(path.join(project, "src/styles/tokens.css"), "utf8") === systemFile("default", "tokens.css"),
			fieldOf(fieldOf(jsonAt(path.join(project, "widgetarium.json")), "design"), "system"),
		],
		[true, "default"],
	);
	check(
		"and its agent reads the system's USAGE.md before its DESIGN.md",
		[
			fs.readFileSync(path.join(project, "docs/design-system/USAGE.md"), "utf8") === systemFile("default", "USAGE.md"),
			agentReadOrderIn(fs.readFileSync(path.join(project, "AGENTS.md"), "utf8")),
		],
		[true, ["USAGE.md", "DESIGN.md", "src/styles/tokens.css"]],
	);
	const minimal = path.join(scratch, "minimal-app");
	const pickedMinimal = await cli([
		"create",
		minimal,
		"--system",
		"minimal",
		"--engine",
		engine,
		"--no-install",
		"--no-git",
	]);
	check(
		"--system minimal lays Minimal's tokens and names Minimal",
		[
			pickedMinimal.code,
			fs.readFileSync(path.join(minimal, "src/styles/tokens.css"), "utf8") === systemFile("minimal", "tokens.css"),
			fieldOf(fieldOf(jsonAt(path.join(minimal, "widgetarium.json")), "design"), "system"),
		],
		[0, true, "minimal"],
	);
	const swapped = await cli(["system", "use", "frosted", "--dir", minimal]);
	check(
		"system use frosted rewrites the tokens and the docs and names Frosted, leaving the rest of the config",
		[
			swapped.code,
			fs.readFileSync(path.join(minimal, "src/styles/tokens.css"), "utf8") === systemFile("frosted", "tokens.css"),
			fs.readFileSync(path.join(minimal, "docs/design-system/DESIGN.md"), "utf8") ===
				systemFile("frosted", "DESIGN.md"),
			fieldOf(fieldOf(jsonAt(path.join(minimal, "widgetarium.json")), "design"), "system"),
			fieldOf(fieldOf(jsonAt(path.join(minimal, "widgetarium.json")), "app"), "name"),
		],
		[0, true, true, "frosted", "minimal-app"],
	);
	const unknown = await cli([
		"create",
		path.join(scratch, "nowhere"),
		"--system",
		"nope",
		"--engine",
		engine,
		"--no-install",
		"--no-git",
	]);
	check(
		"create refuses a system nobody shipped, before it writes anything",
		[unknown.code, unknown.said.includes("no design system named nope"), fs.existsSync(path.join(scratch, "nowhere"))],
		[1, true, false],
	);
	check("system check passes the shipped default", (await cli(["system", "check", "default"])).code, 0);
} finally {
	fs.rmSync(scratch, { recursive: true, force: true });
}

console.log(failures === 0 ? "create files: every check passed" : `create files: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
