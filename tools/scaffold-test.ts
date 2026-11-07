import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";
import * as prettier from "prettier";
import { runCli } from "../packages/shared/cli/src/run-cli.ts";
import type { CliOutput } from "../packages/shared/cli/src/cli-output.ts";
import { filesUnder as filesOfTemplate } from "../packages/shared/cli/src/template-files.ts";
import { check, tally } from "./check-helpers.ts";

interface CliRun {
	readonly code: number;
	readonly said: string;
}

interface ProcessRun {
	readonly code: number | null;
	readonly said: string;
}

const REPO = path.resolve(import.meta.dirname, "..");
const PROBE = path.join(REPO, "tools", `.scaffold-probe-${process.pid}`);
const LOADER = path.join(REPO, "tools/loader/register.mts");
const COPIED_PACKAGES = ["packages/shared/data-framework", "packages/shared/core", "packages/shared/kit", "packages/domain/fixture-billing"];
const LINKED_SCOPE = "@widgetarium";
const NOTES = "packages/domain/notes";
const BILLING = "packages/state/billing";
const NOTES_CHECKS = ["tools/notes-tasks-checks.ts", "tools/notes-tags-checks.ts"];
const BILLING_CHECKS = ["tools/billing-ledger-checks.ts"];
const KEPT_NOTE = "// TODO: keep this note";

try {
	layProbe();
	await checksScaffolding();
	await checksOutputPassesGates();
	await checksRefusals();
} finally {
	fs.rmSync(PROBE, { recursive: true, force: true });
}

console.log(tally.failed ? `scaffold: ${tally.failed} check(s) failed` : "scaffold: all checks passed");
process.exit(tally.failed ? 1 : 0);

function layProbe(): void {
	const rootManifest = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8"));
	const manifest = {
		name: "scaffold-probe",
		private: true,
		type: "module",
		workspaces: ["packages/shared/*", "packages/domain/*"],
		scripts: { "test:types": "tsc -b packages/shared/core tools" },
		prettier: rootManifest.prettier,
	};
	fs.mkdirSync(path.join(PROBE, "tools"), { recursive: true });
	fs.writeFileSync(path.join(PROBE, "package.json"), `${JSON.stringify(manifest, null, "\t")}\n`);
	fs.copyFileSync(path.join(REPO, ".prettierignore"), path.join(PROBE, ".prettierignore"));
	fs.copyFileSync(path.join(REPO, "tools/check-helpers.ts"), path.join(PROBE, "tools/check-helpers.ts"));
	fs.copyFileSync(path.join(REPO, "tools/tsconfig.json"), path.join(PROBE, "tools/tsconfig.json"));

	for (const folder of COPIED_PACKAGES) {
		fs.cpSync(path.join(REPO, folder), path.join(PROBE, folder), { recursive: true });
	}

	layNodeModules();
}

function layNodeModules(): void {
	const modules = path.join(PROBE, "node_modules");
	fs.mkdirSync(path.join(modules, LINKED_SCOPE), { recursive: true });

	for (const entry of fs.readdirSync(path.join(REPO, "node_modules"))) {
		if (entry !== LINKED_SCOPE && entry !== ".cache") {
			fs.symlinkSync(path.join(REPO, "node_modules", entry), path.join(modules, entry));
		}
	}

	for (const name of ["core", "data-framework", "kit"]) {
		fs.symlinkSync(`../../packages/shared/${name}`, path.join(modules, LINKED_SCOPE, name));
	}
}

async function cli(...argv: string[]): Promise<CliRun> {
	const said: string[] = [];
	const output: CliOutput = {
		out: (text) => said.push(text),
		err: (text) => said.push(text),
	};
	const code = await runCli(argv, output, PROBE);
	return { code, said: said.join("\n") };
}

async function checksScaffolding(): Promise<void> {
	const runs = [
		await cli("add", "module", "notes", "--on", "Device"),
		await cli("add", "feature", "notes/tasks", "--query", "Tasks", "--command", "AddTask"),
		keepNoteInModule(),
		await cli("add", "feature", "notes/tags"),
		await cli("add", "module", "billing", "--on", "Server", "--in", "state"),
		await cli("add", "feature", "billing/ledger", "--command", "Charge"),
	];
	check(
		"add module and add feature answer 0",
		runs.map(({ code }) => code),
		[0, 0, 0, 0, 0, 0],
	);
	const manifest = JSON.parse(probeText("package.json"));
	check("a module outside the globbed workspaces is registered, and both join test:types", manifest.workspaces, [
		"packages/shared/*",
		"packages/domain/*",
		BILLING,
	]);
	check(
		"test:types builds both modules",
		manifest.scripts["test:types"],
		`tsc -b ${BILLING} ${NOTES} packages/shared/core tools`,
	);
	checksLaidFiles();
}

function keepNoteInModule(): CliRun {
	const moduleFile = path.join(PROBE, NOTES, "module.ts");
	fs.appendFileSync(moduleFile, `\n${KEPT_NOTE}\n`);
	return { code: 0, said: "" };
}

function checksLaidFiles(): void {
	check(
		"module.ts ends with .handles(...handled) and add feature leaves it alone, handled lists every feature's requests, and a server module is guarded",
		[
			probeText(`${NOTES}/module.ts`).includes(".handles(...handled);"),
			probeText(`${NOTES}/module.ts`).includes(KEPT_NOTE),
			handledIn(NOTES),
			handledIn(BILLING),
			probeText(`${BILLING}/module.ts`).includes(".guard(AuthenticatedGuard)"),
		],
		[true, true, "AddTaskCommand, TagsQuery, TasksQuery", "ChargeCommand", true],
	);
	check(
		"every laid request is public and takes its builder from #module",
		[`${NOTES}/features/tasks/requests.ts`, `${BILLING}/features/ledger/requests.ts`].map((file) => [
			probeText(file).includes('from "#module"'),
			probeText(file).includes(".public()"),
			probeText(file).includes(".inject("),
		]),
		[
			[true, true, false],
			[true, true, false],
		],
	);
	check(
		"a module's package resolves #module to its generated builders",
		JSON.parse(probeText(`${NOTES}/package.json`)).imports["#module"].source,
		"./generated/command.ts",
	);
	check(
		"the parts picker holds a memory gateway per feature",
		["tasks: new MemoryTasksGateway", "tags: new MemoryTagsGateway"].map((part) =>
			probeText(`${NOTES}/gateways/notes-parts/notes-parts.gateway.ts`).includes(part),
		),
		[true, true],
	);
	check(
		"a server module's package exports its module only under the server condition, and the LICENSE is the sibling's",
		[
			JSON.parse(probeText(`${BILLING}/package.json`)).exports["./module"],
			probeText(`${BILLING}/LICENSE`) === probeText("packages/domain/fixture-billing/LICENSE"),
		],
		[{ server: "./module.ts" }, true],
	);
	check(
		"no empty folder is laid ahead: shared/lib waits for a feature that needs it",
		fs.existsSync(path.join(PROBE, NOTES, "shared/lib")),
		false,
	);
}

async function checksOutputPassesGates(): Promise<void> {
	check("generate --check finds both modules fresh", (await cli("generate", NOTES, BILLING, "--check")).code, 0);
	const typed = run(path.join(REPO, "node_modules/.bin/tsc"), ["-b", NOTES, BILLING, "tools"]);
	check("the scaffolded modules and their checks type-check", typed.code === 0 ? "" : typed.said, "");
	const linted = run(process.execPath, [path.join(REPO, "tools/lint-code.mts"), NOTES, BILLING]);
	check("lint-code finds nothing", linted.code === 0 ? "" : linted.said, "");
	check("the widgetarium eslint rules find nothing", await eslintFindings(), []);
	check("every written file is formatted", await unformattedFiles(), []);

	for (const file of [...NOTES_CHECKS, ...BILLING_CHECKS]) {
		const ran = run(process.execPath, ["--single-threaded", "--import", LOADER, file]);
		check(`${file} passes against the real handlers`, ran.code === 0 ? "" : ran.said, "");
	}
}

async function checksRefusals(): Promise<void> {
	const before = filesUnder(PROBE);
	const refusals = [
		await cli("add", "module", "notes", "--on", "Device"),
		await cli("add", "module", "Notes", "--on", "Device"),
		await cli("add", "module", "drafts", "--on", "Cloud"),
		await cli("add", "module", "core", "--on", "Device"),
		await cli("add", "feature", "notes/tasks"),
		await cli("add", "feature", "nowhere/tasks"),
		await cli("add", "feature", "notes/tasks/extra"),
		await cli("add", "feature", "notes/app"),
	];
	check(
		"an existing folder, a bad name, a bad placement, a taken package, an existing feature, a missing module, a path too deep and a name the scaffold binds are refused",
		refusals.map(({ code, said }) => [code, saidKind(said)]),
		[
			[1, "already exists"],
			[1, "kebab case"],
			[1, "--on takes"],
			[1, "already names packages/shared/core"],
			[1, "already exists"],
			[1, "create it first"],
			[1, "add feature takes"],
			[1, "already binds"],
		],
	);
	check("a refusal writes nothing", filesUnder(PROBE), before);
}

function saidKind(said: string): string {
	const kinds = [
		"add feature takes",
		"already exists",
		"kebab case",
		"--on takes",
		"already names packages/shared/core",
		"create it first",
		"already binds",
	];
	return kinds.find((kind) => said.includes(kind)) ?? said;
}

async function eslintFindings(): Promise<string[]> {
	const eslint = new ESLint({
		cwd: REPO,
		overrideConfigFile: path.join(REPO, "eslint.config.mjs"),
		ignore: false,
	});
	const files = [NOTES, BILLING].flatMap((folder) =>
		filesUnder(path.join(PROBE, folder))
			.filter((file) => file.endsWith(".ts") && !file.includes("generated/"))
			.map((file) => path.join(PROBE, folder, file)),
	);
	const results = await eslint.lintFiles(files);
	return results.flatMap(({ filePath, messages }) =>
		messages.map((message) => `${path.relative(PROBE, filePath)}:${message.line} ${message.message}`),
	);
}

async function unformattedFiles(): Promise<string[]> {
	const written = [
		"package.json",
		...[NOTES, BILLING].flatMap((folder) =>
			filesUnder(path.join(PROBE, folder))
				.filter((file) => !file.includes("generated/") && file !== "LICENSE")
				.map((file) => `${folder}/${file}`),
		),
		...NOTES_CHECKS,
		...BILLING_CHECKS,
	];
	const checked = await Promise.all(written.map(async (file) => ((await isFormatted(file)) ? null : file)));
	return checked.filter((file): file is string => file !== null);
}

async function isFormatted(file: string): Promise<boolean> {
	const at = path.join(PROBE, file);
	const options = await prettier.resolveConfig(at);
	return prettier.check(fs.readFileSync(at, "utf8"), { ...options, filepath: at });
}

function handledIn(folder: string): string {
	const code = probeText(`${folder}/generated/handled.ts`).replace(/\s+/g, " ");
	return /handled: readonly ModuleItem\[\] = \[([^\]]*)\]/.exec(code)?.[1]?.trim().replace(/,$/, "") ?? "";
}

function probeText(file: string): string {
	return fs.readFileSync(path.join(PROBE, file), "utf8");
}

function filesUnder(folder: string): string[] {
	return filesOfTemplate(folder, (file) => !file.startsWith("node_modules"));
}

function run(command: string, args: readonly string[]): ProcessRun {
	const ran = spawnSync(command, args, { cwd: PROBE, encoding: "utf8" });
	return { code: ran.status, said: `${ran.stdout}${ran.stderr}` };
}
