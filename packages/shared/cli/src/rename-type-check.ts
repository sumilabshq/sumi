import { spawnSync } from "node:child_process";
import path from "node:path";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import { jsonAt } from "@widgetarium/eslint-plugin/workspace";
import type { CliOutput } from "./cli-output.js";

const TYPES_PASSED = "type check: passed";
const TYPES_FAILED = "type check failed after the rename; git is the undo:\n{said}";
const TYPES_SKIPPED = "type check: skipped (--skip-types)";
const TYPES_SCRIPT = "test:types";
const SHOWN_TAIL_LINES = 40;
const OUTPUT_BYTES = 64 * 1024 * 1024;

export function typeCheckReported(root: string, isTypeChecked: boolean, output: CliOutput): number {
	if (!isTypeChecked) {
		output.out(TYPES_SKIPPED);
		return 0;
	}

	const { command, args } = typeCheckOf(root);
	const ran = spawnSync(command, args, { cwd: root, encoding: "utf8", maxBuffer: OUTPUT_BYTES });

	if (ran.status === 0) {
		output.out(TYPES_PASSED);
		return 0;
	}

	const said = `${ran.stdout}\n${ran.stderr}`.trim().split("\n").slice(-SHOWN_TAIL_LINES).join("\n");
	output.err(fillTemplate(TYPES_FAILED, { said }));
	return 1;
}

function typeCheckOf(root: string): TypeCheck {
	const manifest = jsonAt(path.join(root, "package.json"));
	const scripts = typeof manifest === "object" && manifest !== null ? Reflect.get(manifest, "scripts") : null;

	if (typeof scripts === "object" && scripts !== null && TYPES_SCRIPT in scripts) {
		return {
			command: "npm",
			args: ["run", "-s", TYPES_SCRIPT],
		};
	}

	return {
		command: "npx",
		args: ["--no-install", "tsc", "--noEmit"],
	};
}

interface TypeCheck {
	readonly command: string;
	readonly args: readonly string[];
}
