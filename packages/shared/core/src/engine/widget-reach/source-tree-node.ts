import { parse } from "@babel/parser";

export interface SourceTreeNode {
	readonly type: string;
	readonly [key: string]: unknown;
}

const SOURCE_PLUGINS = ["jsx", "typescript"] as const;

export function isSourceTreeNode(held: unknown): held is SourceTreeNode {
	return typeof held === "object" && held !== null && typeof Reflect.get(held, "type") === "string";
}

export function parsedProgram(source: string): SourceTreeNode | null {
	try {
		const parsed: unknown = parse(source, { sourceType: "module", plugins: [...SOURCE_PLUGINS] });
		return isSourceTreeNode(parsed) ? childOf(parsed, "program") : null;
	} catch {
		return null;
	}
}

export function lineOf(node: SourceTreeNode): number {
	const loc = node["loc"];
	const start: unknown = typeof loc === "object" && loc !== null ? Reflect.get(loc, "start") : null;
	const line: unknown = typeof start === "object" && start !== null ? Reflect.get(start, "line") : null;
	return typeof line === "number" ? line : 0;
}

export function childOf(node: SourceTreeNode, key: string): SourceTreeNode | null {
	const held = node[key];
	return isSourceTreeNode(held) ? held : null;
}

export function childrenOf(node: SourceTreeNode, key: string): SourceTreeNode[] {
	const held = node[key];
	return Array.isArray(held) ? held.filter(isSourceTreeNode) : [];
}
