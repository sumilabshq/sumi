import { z } from "zod";

export const NoFieldsSchema = z.object({});

export type NoFields = z.output<typeof NoFieldsSchema>;
