import { isObject } from "./is-object";

export type Metadata = Readonly<Record<string, unknown>>;

export const NO_METADATA: Metadata = Object.freeze({});

const NOT_AN_OBJECT = "{label}.metadata() takes an object of fields, such as { description: \"…\" }";

export function metadataWith(label: string, current: Metadata, fields: Metadata): Metadata {
	if (!isObject(fields) || Array.isArray(fields)) {
		throw new Error(NOT_AN_OBJECT.replace("{label}", label));
	}

	return Object.freeze({
		...current,
		...fields,
	});
}
