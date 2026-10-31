import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REPO, packPackages } from "./pack-engine.mts";
import { fieldOf } from "./export-source.mts";

const CONTRACT = "@sumi/contract";
const FROM_THE_REPO = ["react", "react-dom", "zod", "typescript", "@types/react", "@types/react-dom"];
const INTO_FLAG = "--into";
const ONLY_CORE_AND_ZOD = /from\s*"(?!zod"|@widgetarium\/core\/requests"|\.)[^"]+"/g;

const APP = `import { FileSystemModule, ReadFileQuery, WriteFileCommand, contractRefusal, CONTRACT_RANGE } from "@sumi/contract";
import { app, messagePortTransport, portFromParent } from "@widgetarium/core/requests";

const files = app().imports(FileSystemModule.over(messagePortTransport(portFromParent()))).start();

export async function keep(content: string): Promise<string | null> {
	await files.send(WriteFileCommand, { path: "tasks.json", content });
	const read = await files.send(ReadFileQuery, { path: "tasks.json" });
	return read.ok ? read.output : null;
}

export const gate: string | null = contractRefusal(CONTRACT_RANGE, "0.3.0");
`;

const WRONG_APP = `import { WriteFileCommand } from "@sumi/contract";
import { app } from "@widgetarium/core/requests";

export const sent = app().start().send(WriteFileCommand, { path: 1 });
`;

const PROJECT_TSCONFIG = {
	compilerOptions: {
		target: "ES2022",
		module: "ESNext",
		moduleResolution: "bundler",
		lib: ["ES2022", "DOM"],
		strict: true,
		noEmit: true,
		skipLibCheck: true,
		types: [],
	},
	include: ["src"],
};

let failures = 0;

function check(name: string, held: unknown, wanted: unknown): void {
	const same = held === wanted;
	if (!same) failures += 1;
	console.log(`${same ? "ok  " : "not ok"} ${name}${same ? "" : `\n      held ${String(held)}`}`);
}

function versionInRepo(name: string): string {
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(REPO, "node_modules", name, "package.json"), "utf8"));
	const version = fieldOf(manifest, "version");
	if (typeof version !== "string") throw new Error(`${name} in the repo names no version`);
	return version;
}

function typeErrorsIn(project: string, source: string): string {
	fs.writeFileSync(path.join(project, "src/app.ts"), source);
	try {
		execFileSync(path.join(project, "node_modules/.bin/tsc"), ["-p", project], { encoding: "utf8", stdio: "pipe" });
		return "";
	} catch (failure) {
		return String(fieldOf(failure, "stdout") ?? failure);
	}
}

function installIn(project: string): void {
	const npmInstall = (...options: string[]): void => {
		execFileSync("npm", ["install", "--no-audit", "--no-fund", ...options], { cwd: project, stdio: "pipe" });
	};
	try {
		npmInstall("--offline");
		console.log(`installed offline into ${project}`);
	} catch {
		npmInstall();
		console.log(`installed online into ${project}`);
	}
}

function shippedImportsOf(folder: string): string[] {
	return fs
		.readdirSync(folder, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && /\.(js|d\.ts)$/.test(entry.name))
		.flatMap(
			(entry) => fs.readFileSync(path.join(entry.parentPath, entry.name), "utf8").match(ONLY_CORE_AND_ZOD) ?? [],
		);
}

const into = process.argv.includes(INTO_FLAG) ? process.argv[process.argv.indexOf(INTO_FLAG) + 1] : undefined;
const packed = await packPackages(["packages/shared/kit", "packages/shared/core", "packages/shared/contract"]);
const contract = packed.find(({ name }) => name === CONTRACT);
const core = packed.find(({ name }) => name === "@widgetarium/core");

if (contract === undefined || core === undefined) {
	throw new Error("packing gave no @sumi/contract or no @widgetarium/core");
}

const project = fs.mkdtempSync(path.join(os.tmpdir(), "sumi-contract-package-"));
try {
	const engine = packed.filter(({ name }) => name !== CONTRACT).map(({ name, tarball }) => [name, `file:${tarball}`]);
	fs.writeFileSync(
		path.join(project, "package.json"),
		JSON.stringify({
			name: "sumi-contract-probe",
			private: true,
			type: "module",
			dependencies: Object.fromEntries([
				[CONTRACT, `file:${contract.tarball}`],
				...engine,
				...FROM_THE_REPO.map((name) => [name, versionInRepo(name)]),
			]),
		}),
	);
	fs.writeFileSync(path.join(project, "tsconfig.json"), JSON.stringify(PROJECT_TSCONFIG));
	fs.mkdirSync(path.join(project, "src"));
	installIn(project);
	const shipped = path.join(project, "node_modules", CONTRACT);
	check("the tarball ships a built dist", fs.existsSync(path.join(shipped, "dist/index.js")), true);
	check("the tarball ships its declarations", fs.existsSync(path.join(shipped, "dist/index.d.ts")), true);
	check("the shipped files import only zod and @widgetarium/core/requests", shippedImportsOf(shipped).join(", "), "");
	check("an app outside the repo type-checks WriteFileCommand and FileSystemModule", typeErrorsIn(project, APP), "");
	check(
		"and a wrong input is a type error there, so the check can fail",
		typeErrorsIn(project, WRONG_APP).includes("error TS"),
		true,
	);
} finally {
	fs.rmSync(project, { recursive: true, force: true });
}

if (into !== undefined) {
	fs.mkdirSync(into, { recursive: true });
	const kept = path.join(into, path.basename(contract.tarball));
	fs.copyFileSync(contract.tarball, kept);
	console.log(`kept ${kept}`);
}

console.log(failures === 0 ? "contract package: all checks passed" : `contract package: ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
