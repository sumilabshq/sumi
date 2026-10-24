import type { Expression, Node, Statement } from "@babel/types";
import { chainOf, exportedConstsOf, rootCallOf } from "./babel-chain.js";

export type ModuleRuns = "client" | "server" | "anywhere";

export interface DeclaredModule {
	readonly runs: ModuleRuns;
	readonly name: string;
	readonly placedOn: ModuleRuns | null;
}

const STARTERS: Readonly<Record<string, ModuleRuns>> = {
	serverModule: "server",
	clientModule: "client",
	module: "anywhere",
};
const PLACEMENT_METHOD = "on";
const PLACEMENTS: Readonly<Record<string, ModuleRuns>> = {
	Server: "server",
	Device: "client",
	Anywhere: "anywhere",
};

export function moduleDeclaredIn(body: readonly Statement[]): DeclaredModule | null {
	for (const { name, init } of exportedConstsOf(body)) {
		const runs = runsOfStarter(init);

		if (runs !== null) {
			return {
				runs,
				name,
				placedOn: placementOf(init),
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

function placementOf(init: Expression): ModuleRuns | null {
	const [placement] = chainOf(init).find(({ method }) => method === PLACEMENT_METHOD)?.call.arguments ?? [];
	return placement?.type === "Identifier" ? (PLACEMENTS[placement.name] ?? null) : null;
}
