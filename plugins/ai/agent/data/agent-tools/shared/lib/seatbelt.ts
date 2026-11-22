import { TEMP_FOLDER, USER_TEMP_PATTERN } from "./sandbox.js";
import type { Sandbox } from "./sandbox.js";

export interface ShellLaunch {
	readonly program: string;
	readonly args: string[];
}

const SHELL = "sh";
const SANDBOX_EXEC = "/usr/bin/sandbox-exec";
const DEVICE_RULES = ['(literal "/dev/null")', '(literal "/dev/zero")', '(regex #"^/dev/tty")', '(regex #"^/dev/fd/")'];

// TODO: Windows has no sh, Linux needs bwrap; a sandboxed run without sandbox-exec fails closed
export function shellLaunchOf(sandbox: Sandbox, line: string): ShellLaunch {
	if (sandbox.kind === "full") {
		return {
			program: SHELL,
			args: ["-c", line],
		};
	}

	return {
		program: SANDBOX_EXEC,
		args: ["-p", seatbeltProfileOf(sandbox), SHELL, "-c", line],
	};
}

export function seatbeltProfileOf(sandbox: Sandbox): string {
	const roots =
		sandbox.kind === "project"
			? [TEMP_FOLDER, ...sandbox.roots].map((root) => `(subpath ${quoted(root)})`).concat(`(regex #${quoted(USER_TEMP_PATTERN)})`)
			: [];
	return [
		"(version 1)",
		"(allow default)",
		"(deny file-write*)",
		`(allow file-write* ${[...roots, ...DEVICE_RULES].join(" ")})`,
	].join("\n");
}

function quoted(path: string): string {
	return `"${path.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
