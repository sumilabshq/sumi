import { z } from "zod";
import { ChatKeySchema } from "./chat-key.schema.js";

export const OptionChoiceSchema = z.object({
	value: z.string(),
	label: z.string(),
	note: z.string().optional(),
});

export const AgentOptionSchema = z.object({
	key: z.string(),
	label: z.string(),
	choices: z.array(OptionChoiceSchema),
	default: z.string(),
});

export type AgentOption = z.infer<typeof AgentOptionSchema>;

export const AgentModelSchema = z.object({
	id: z.string(),
	label: z.string(),
	note: z.string().optional(),
	options: z.array(AgentOptionSchema),
});

export type AgentModel = z.infer<typeof AgentModelSchema>;

export const MeterWindowSchema = z.object({
	key: z.string(),
	label: z.string(),
});

export const AgentMeterSchema = z.object({
	key: z.string(),
	label: z.string(),
	windows: z.array(MeterWindowSchema),
});

export type AgentMeter = z.infer<typeof AgentMeterSchema>;

export const RunnerCatalogSchema = z.object({
	id: z.string(),
	label: z.string(),
	models: z.array(AgentModelSchema),
	meters: z.array(AgentMeterSchema),
});

export type RunnerCatalog = z.infer<typeof RunnerCatalogSchema>;

export const RunnerShownSchema = z.object({
	id: z.string(),
	label: z.string(),
	models: z.array(AgentModelSchema),
});

export const RunnersShownSchema = z.object({
	runners: z.array(RunnerShownSchema),
	chosenRunner: z.string().nullable(),
	chosenModel: z.string().nullable(),
});

export type RunnersShown = z.infer<typeof RunnersShownSchema>;

export const OptionShownSchema = z.object({
	option: AgentOptionSchema,
	value: z.string(),
});

export const OptionsShownSchema = z.array(OptionShownSchema);

export type OptionsShown = z.infer<typeof OptionsShownSchema>;

export const MeterWindowShownSchema = z.object({
	key: z.string(),
	label: z.string(),
	used: z.number().nonnegative(),
	resetsAt: z.number().int().nonnegative(),
});

export const MeterShownSchema = z.object({
	key: z.string(),
	label: z.string(),
	windows: z.array(MeterWindowShownSchema),
	isReported: z.boolean(),
});

export const MetersShownSchema = z.array(MeterShownSchema);

export type MetersShown = z.infer<typeof MetersShownSchema>;

export const ModelAskedSchema = ChatKeySchema.extend({
	runner: z.string(),
	model: z.string(),
});

export const OptionAskedSchema = ChatKeySchema.extend({
	key: z.string(),
	value: z.string(),
});
