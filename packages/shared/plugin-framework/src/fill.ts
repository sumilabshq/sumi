import type { z } from "zod";
import type { SlotShape } from "./declared-slot";

export class Fill<S extends z.ZodType = z.ZodType> {
	constructor(
		readonly slot: SlotShape<S>,
		readonly id: string,
		readonly item: unknown,
	) {}
}
