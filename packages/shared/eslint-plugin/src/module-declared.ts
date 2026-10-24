import type { Node, Statement } from "@babel/types";
import { exportedConstsOf, rootCallOf } from "./babel-chain.js";

export type ModuleRuns = "client" | "server" | "anywhere";

export interface DeclaredModule {
	readonly runs: ModuleRuns;
	readonly name: string;
}

const STARTERS: Readonly<Record<string, ModuleRuns>> = {
	serverModule: "server",
	clientModule: "client",
	module: "anywhere",
};

export function moduleDeclaredIn(body: readonly Statement[]): DeclaredModule | null {
	for (const { name, init } of exportedConstsOf(body)) {
		const runs = runsOfStarter(init);

		if (runs !== null) {
			return {
				runs,
				name,
			};
		}
	}

	return null;
}

export function runsDeclaredIn(body: readonly Statement[]): ModuleRuns | null {
	return moduleDeclaredIn(body)?.runs ?? null;
}

export function runsOfStarter(node: Node): ModuleRuns | null {
	return STARTERS[rootCallOf(node)?.method ?? ""] ?? null;
}
