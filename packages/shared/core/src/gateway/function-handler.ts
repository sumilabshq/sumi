import type { Declaration } from "./declaration";

const WRAPPERS = new WeakMap<object, WeakMap<Declaration, object>>();

export function isQueryFunction(declaration: Declaration, given: unknown): given is object {
	return typeof given === "function" && declaration.isQuery === true;
}

export function implementationOfFunction(declaration: Declaration, answer: object): object {
	const byDeclaration = WRAPPERS.get(answer) ?? new WeakMap<Declaration, object>();
	WRAPPERS.set(answer, byDeclaration);
	const held = byDeclaration.get(declaration);
	if (held) return held;
	const made = wrapperOf(declaration, answer);
	byDeclaration.set(declaration, made);
	return made;
}

function wrapperOf(declaration: Declaration, answer: object): object {
	if (declaration.input) return { query: answer };
	return declaration.kind === "collection" ? { list: answer } : { get: answer };
}
