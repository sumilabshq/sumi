import { z } from "zod";

export const BoxSchema = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() });

export const SpotSchema = z.object({ mark: z.string(), screen: BoxSchema, target: BoxSchema, radius: z.number() });

export const SelectionSchema = z.object({ widget: z.string(), mark: z.string(), spot: SpotSchema.nullable() });

export const SelectAskSchema = z.object({ selection: SelectionSchema.nullable() });

export type Spot = z.output<typeof SpotSchema>;
export type Selection = z.output<typeof SelectionSchema>;
