import { isObject } from "../engine/is-object";

const IDENTITY_MARK = "\u0000identity:";
const IDENTITIES = new WeakMap<object, string>();
const IDENTITIES_MADE = { count: 0 };

export function stableKey(input: unknown): string {
	if (input === undefined) return "";
	return JSON.stringify(sortKeys(input, new Set()));
}

function sortKeys(input: unknown, path: Set<object>): unknown {
	if (typeof input === "function") return identityKeyOf(input);
	if (!isObject(input)) return input;
	if (path.has(input) || !isPlain(input)) return identityKeyOf(input);
	path.add(input);
	const sorted = Array.isArray(input) ? input.map((one) => sortKeys(one, path)) : sortedFields(input, path);
	path.delete(input);
	return sorted;
}

function sortedFields(input: Readonly<Record<string, unknown>>, path: Set<object>): Record<string, unknown> {
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(input).sort()) sorted[key] = sortKeys(input[key], path);
	return sorted;
}

function isPlain(input: object): boolean {
	const prototype: unknown = Object.getPrototypeOf(input);
	return prototype === Object.prototype || prototype === Array.prototype || prototype === null;
}

function identityKeyOf(held: object): string {
	const known = IDENTITIES.get(held);
	if (known !== undefined) return known;
	const made = `${IDENTITY_MARK}${IDENTITIES_MADE.count++}`;
	IDENTITIES.set(held, made);
	return made;
}
