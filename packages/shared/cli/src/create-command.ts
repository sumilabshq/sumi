import fs from "node:fs";
import * as fileSystem from "node:fs/promises";
import path from "node:path";
import {
	layProject,
	nodeProjectWriter,
	unknownSystemSaying,
	type DesignSystemSeed,
	type ProjectToLay,
} from "@widgetarium/core/project/index.js";
import type { CreateArgs } from "./cli-args.js";
import { CliRefusal, type CliOutput } from "./cli-output.js";
import {
	engineClosureIn,
	engineFolderFor,
	enginePackagesOf,
	vendorEngine,
	type EngineTarball,
} from "./engine-tarballs.js";
import { packageLocations } from "./package-locations.js";
import { projectSeedOf, systemsIn } from "./project-seed-read.js";
import { formatProject } from "./project-format.js";
import { runIn } from "./run-process.js";

const CREATE_COMMIT = "chore: create app";

export async function runCreate(args: CreateArgs, output: CliOutput): Promise<number> {
	const target = path.resolve(args.dir);
	refuseOccupied(target);
	const creation = creationOf(args);
	await layCreatedApp(target, creation).catch((error: unknown) => {
		fs.rmSync(target, { recursive: true, force: true });
		throw error;
	});
	if (args.install) runIn(target, "npm", ["install", "--no-audit", "--no-fund"]);
	if (args.git) commitCreatedApp(target);
	output.out(nextStepsOf(target, args));
	return 0;
}

interface Creation {
	readonly project: ProjectToLay;
	readonly closure: readonly EngineTarball[];
}

export function chosenSystemOf(systems: Readonly<Record<string, DesignSystemSeed>>, system: string): DesignSystemSeed {
	const chosen = systems[system];
	if (chosen !== undefined) return chosen;
	throw new CliRefusal(unknownSystemSaying(system, Object.keys(systems)));
}

function creationOf(args: CreateArgs): Creation {
	const locations = packageLocations();
	const systems = systemsIn(locations.systems);
	chosenSystemOf(systems, args.system);
	const closure = engineClosureIn(engineFolderFor(args.engine, locations.repo));
	const seed = projectSeedOf({ locations, engine: enginePackagesOf(closure), systems });
	return { project: { name: args.name, system: args.system, seed }, closure };
}

async function layCreatedApp(target: string, { project, closure }: Creation): Promise<void> {
	await layProject(nodeProjectWriter(target, fileSystem), project);
	vendorEngine(closure, target);
	await formatProject(target);
}

function refuseOccupied(target: string): void {
	if (!fs.existsSync(target)) return;
	if (!fs.statSync(target).isDirectory()) throw new CliRefusal(`${target} is a file; name a new or empty folder`);
	if (fs.readdirSync(target).length > 0) throw new CliRefusal(`${target} is not empty; name a new or empty folder`);
}

function commitCreatedApp(target: string): void {
	runIn(target, "git", ["init", "--quiet"]);
	runIn(target, "git", ["add", "--all"]);
	runIn(target, "git", ["commit", "--quiet", "--message", CREATE_COMMIT]);
}

function nextStepsOf(target: string, args: CreateArgs): string {
	const install = args.install ? [] : ["  npm install"];
	return [`created ${args.name} in ${target}`, "next:", `  cd ${target}`, ...install, "  npm run dev"].join("\n");
}
