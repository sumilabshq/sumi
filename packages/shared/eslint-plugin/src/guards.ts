import type * as ESTree from "estree";

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null;
}

export function fieldOf(value: unknown, key: string): unknown {
	return isRecord(value) ? value[key] : undefined;
}

export function isNode(value: unknown): value is ESTree.Node {
	return typeof fieldOf(value, "type") === "string";
}
