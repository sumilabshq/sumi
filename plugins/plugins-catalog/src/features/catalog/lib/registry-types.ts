import type { z } from "zod";
import type { RegistryEntrySchema, RegistrySchema } from "@widgetarium/plugin-registry/contract";

export type RegistrySchemaOutput = z.infer<typeof RegistrySchema>;

export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;
