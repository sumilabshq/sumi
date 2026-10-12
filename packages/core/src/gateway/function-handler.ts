import type { Declaration } from "./declaration";

export function isQueryFunction(declaration: Declaration, given: unknown): boolean {
	return typeof given === "function" && declaration.isQuery === true;
}

export function implementationOfFunction(declaration: Declaration, answer: unknown): object {
	if (declaration.input) return { query: answer };
	return declaration.kind === "collection" ? { list: answer } : { get: answer };
}
