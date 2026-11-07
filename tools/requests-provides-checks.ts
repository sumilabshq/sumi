import { spawnSync } from "node:child_process";
import { check } from "./check-helpers.ts";

const PROBE = "tools/runtime-provides-probe/tsconfig.json";
const DIAGNOSTIC = /^(?<file>[^(\s]+)\((?<line>\d+),\d+\): error (?<code>TS\d+): (?<message>.*)$/;

const compiled = spawnSync("npx", ["--no-install", "tsc", "-p", PROBE, "--pretty", "false"], { encoding: "utf8" });
const diagnostics = compiled.stdout.split("\n").flatMap((line) => {
	const groups = DIAGNOSTIC.exec(line)?.groups;
	return groups === undefined ? [] : [groups];
});

check(
	"an app that adds a RuntimeProvides key: runtime().start() without .provide() is a type error naming it, with .provide() giving it compiles",
	diagnostics.map(({ file, code, message }) => [file, code, message?.includes("the default runtime lacks clock") === true]),
	[["tools/runtime-provides-probe/unprovided.ts", "TS2684", true]],
);
