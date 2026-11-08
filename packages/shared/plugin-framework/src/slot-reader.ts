import type { z } from "zod";
import type { FilledItem, SlotShape } from "./declared-slot";
import type { Plugin } from "./plugin";
import { sentenceOf } from "./sentence";
import type { SlotFills } from "./slot-fills";

export interface SlotReader {
	fillsOf<S extends z.ZodObject>(slot: SlotShape<S>): readonly FilledItem<S>[];
}

const NOT_OWN_SLOT = "plugin {plugin} reads slot {slot}, which it does not declare: a plugin reads only its own slots";

export function slotReaderOf(slotFills: SlotFills, reader: Plugin): SlotReader {
	return {
		fillsOf: <S extends z.ZodObject>(slot: SlotShape<S>): readonly FilledItem<S>[] => {
			if (!reader.parts.declaredSlots.some((declared) => declared.identity === slot.identity)) {
				throw new Error(
					sentenceOf(NOT_OWN_SLOT, {
						plugin: reader.id,
						slot: slot.label,
					}),
				);
			}

			const fills = slotFills.byIdentity.get(slot.identity)?.fills ?? [];
			return fills.flatMap(({ id, item }) => {
				const parsed = slot.itemSchema.safeParse(item);
				return parsed.success ? [{ ...parsed.data, id }] : [];
			});
		},
	};
}
