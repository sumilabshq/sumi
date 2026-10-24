import { parse } from "@babel/parser";
import type { Node } from "@babel/types";

export interface SourceEdit {
	readonly start: number;
	readonly end: number;
	readonly text: string;
}

export interface ParsedFile {
	readonly text: string;
	readonly program: Node;
}

export function parsedFile(text: string): ParsedFile {
	return {
		text,
		program: parse(text, { sourceType: "module", plugins: ["typescript"] }).program,
	};
}

export function nodesIn<T extends Node>(root: Node, isWanted: (node: Node) => node is T): T[] {
	const found: T[] = [];
	collectNodes(root, isWanted, found);
	return found;
}

export function endOf(node: Node): number {
	return node.end ?? 0;
}

export function afterImports({ program }: ParsedFile): number {
	const imports = nodesIn(program, (node): node is Node => node.type === "ImportDeclaration");
	return Math.max(0, ...imports.map(endOf));
}

export function withEdits(text: string, edits: readonly SourceEdit[]): string {
	return [...edits]
		.sort((one, other) => other.start - one.start)
		.reduce((edited, { start, end, text: put }) => `${edited.slice(0, start)}${put}${edited.slice(end)}`, text);
}

function collectNodes<T extends Node>(value: unknown, isWanted: (node: Node) => node is T, found: T[]): void {
	if (Array.isArray(value)) {
		for (const item of value) {
			collectNodes(item, isWanted, found);
		}

		return;
	}

	if (!isNode(value)) {
		return;
	}

	if (isWanted(value)) {
		found.push(value);
	}

	for (const [key, child] of Object.entries(value)) {
		if (key !== "loc" && typeof child === "object" && child !== null) {
			collectNodes(child, isWanted, found);
		}
	}
}

function isNode(value: unknown): value is Node {
	return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}
