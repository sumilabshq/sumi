import type { z } from "zod";
import type { FilledItem, Slot, SlotCardinality } from "./declared-slot";
import { stampSlotName } from "./plugin";
import type { Plugin } from "./plugin";
import { sentenceOf } from "./sentence";
import type { SlotFills } from "./slot-fills";

export interface SlotReader {
	fillsOf<S extends z.ZodObject, C extends SlotCardinality>(slot: Slot<S, C>): readonly FilledItem<S>[];
}

const NOT_OWN_SLOT = "plugin {plugin} reads slot {slot}, which it does not declare: a plugin reads only its own slots";

export function slotReaderOf(slotFills: SlotFills, reader: Plugin): SlotReader {
	return {
		fillsOf: <S extends z.ZodObject, C extends SlotCardinality>(slot: Slot<S, C>): readonly FilledItem<S>[] => {
			if (!reader.parts.declaredSlots.includes(slot)) {
				throw new Error(
					sentenceOf(NOT_OWN_SLOT, {
						plugin: reader.id,
						slot: slot.name,
					}),
				);
			}

			const fills = slotFills.slots.get(stampSlotName(reader.id, slot))?.fills ?? [];
			return fills.flatMap(({ id, item }) => {
				const parsed = slot.itemSchema.safeParse(item);
				return parsed.success ? [{ ...parsed.data, id }] : [];
			});
		},
	};
}
