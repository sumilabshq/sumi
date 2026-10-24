import fs from "node:fs";
import * as fileSystem from "node:fs/promises";
import path from "node:path";
import { checkDesignSystem } from "@widgetarium/core/design-system/design-system-check.js";
import {
	PROJECT_CONFIG_FILE,
	nodeProjectFiles,
	nodeProjectWriter,
	systemFilesOf,
} from "@widgetarium/core/project/index.js";
import { z } from "zod";
import type { SystemArgs } from "./cli-args.js";
import { CliRefusal, type CliOutput } from "./cli-output.js";
import { chosenSystemOf } from "./create-command.js";
import { packageLocations } from "./package-locations.js";
import { formatFiles } from "./project-format.js";
import { requiredProjectAbove } from "./project-root.js";
import { systemsIn } from "./project-seed-read.js";

const JsonObjectSchema = z.record(z.string(), z.unknown());

export async function runSystem(args: SystemArgs, output: CliOutput, cwd: string): Promise<number> {
	if (args.action === "check") return checkSystem(args.system, output);
	return useSystem(args, output, cwd);
}

async function checkSystem(system: string, output: CliOutput): Promise<number> {
	const folder = path.join(packageLocations().systems, system);
	if (!fs.existsSync(folder)) throw new CliRefusal(`no design system at ${folder}`);
	const findings = await checkDesignSystem(nodeProjectFiles(folder, fileSystem), system);
	if (findings.length === 0) {
		output.out(`${system}: the design system passes the guard`);
		return 0;
	}
	for (const finding of findings) output.err(`${system}: ${finding}`);
	output.err(`${system}: ${findings.length} finding(s)`);
	return 1;
}

async function useSystem({ system, dir }: SystemArgs, output: CliOutput, cwd: string): Promise<number> {
	const systems = systemsIn(packageLocations().systems);
	const chosen = chosenSystemOf(systems, system);
	const project = await requiredProjectAbove(path.resolve(cwd, dir));
	const written = systemFilesOf(project.config, chosen);
	const writer = nodeProjectWriter(project.root, fileSystem);
	for (const [at, text] of written) await writer.write(at, text);
	await writer.write(PROJECT_CONFIG_FILE, configNamingSystem(project.root, system));
	await formatFiles(project.root, [...written.map(([at]) => at), PROJECT_CONFIG_FILE]);
	output.out(`${project.config.app.name} now uses ${system}: ${written.map(([at]) => at).join(", ")} rewritten`);
	return 0;
}

function configNamingSystem(root: string, system: string): string {
	const config = JsonObjectSchema.parse(JSON.parse(fs.readFileSync(path.join(root, PROJECT_CONFIG_FILE), "utf8")));
	const design = JsonObjectSchema.parse(config["design"] ?? {});
	return `${JSON.stringify({ ...config, design: { ...design, system } }, null, "\t")}\n`;
}
