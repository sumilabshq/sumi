import { reachFindingsIn, saidReachFinding } from "./engine/widget-reach/reach-scan.js";

export type CheckedModules = Readonly<Record<string, string>>;

export interface ReachCheckFinding {
	readonly rule: "escapes";
	readonly message: string;
}

export function reachCheckFindings(modules: CheckedModules): readonly ReachCheckFinding[] {
	return Object.entries(modules)
		.flatMap(([file, source]) => reachFindingsIn(source, file))
		.map((finding): ReachCheckFinding => ({ rule: "escapes", message: saidReachFinding(finding) }));
}
