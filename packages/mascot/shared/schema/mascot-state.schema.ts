import { z } from "zod";

export const MascotStateSchema = z.enum([
	"idle",
	"listening",
	"thinking",
	"working",
	"done",
	"question",
	"error",
	"sleep",
	"pleased",
	"surprised",
]);

export type MascotState = z.infer<typeof MascotStateSchema>;
