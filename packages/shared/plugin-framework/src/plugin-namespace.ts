import type { SlotShape } from "./declared-slot";
import { nameIdentity, placeIdentity } from "./identity";
import { Plugin } from "./plugin";
import { sentenceOf } from "./sentence";

const SLOT = "a slot";
const FIELD_KEY =
	"plugin {plugin} declares a slot named {key}, which is a field of every plugin: rename the slot's constant";

export function namedSlot<T extends SlotShape>(name: string, declared: T): T {
	nameIdentity(declared.identity, name, SLOT);
	return declared;
}

export function pluginWithSlots<S extends Readonly<Record<string, SlotShape>>>(
	definition: Plugin,
	slots: S,
): Plugin & S {
	const fieldKey = Object.keys(slots).find((key) => key in definition);

	if (fieldKey !== undefined) {
		throw new Error(sentenceOf(FIELD_KEY, { plugin: definition.id, key: fieldKey }));
	}

	for (const each of Object.values(slots)) {
		placeIdentity(each.identity, definition.id, SLOT);
	}

	return Object.assign(new Plugin(definition.id, definition.parts), slots);
}
