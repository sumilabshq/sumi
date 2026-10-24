import type { HostProps } from "../engine/gpu-context.js";

export type ProbedAttributes = Readonly<Record<string, string>>;

const MATCHED_BY_VARIANTS = /^(?:data|aria)-/;

export function probedAttributesOf(props: HostProps): ProbedAttributes {
	const kept = Object.entries(props).flatMap(([name, value]) =>
		MATCHED_BY_VARIANTS.test(name) && isAttributeValue(value) ? [[name, String(value)] as const] : [],
	);
	return Object.fromEntries(kept);
}

export function writeAttributes(element: Element, attributes: ProbedAttributes): void {
	for (const [name, value] of Object.entries(attributes)) {
		element.setAttribute(name, value);
	}
}

function isAttributeValue(value: unknown): value is string | number | boolean {
	return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
