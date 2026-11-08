import type { Plugin } from "./plugin";
import { sentenceOf } from "./sentence";

const FIELD_KEY =
	"plugin {plugin} gets a generated field named {key}, which is a field of every plugin: rename what the generator names it after";

export function pluginWithSlots<Api, S extends Readonly<Record<string, unknown>>>(
	definition: Plugin<Api>,
	slots: S,
): Plugin<Api> & S {
	const fieldKey = Object.keys(slots).find((key) => key in definition);

	if (fieldKey !== undefined) {
		throw new Error(sentenceOf(FIELD_KEY, { plugin: definition.id, key: fieldKey }));
	}

	return Object.assign(definition.copy(), slots);
}
