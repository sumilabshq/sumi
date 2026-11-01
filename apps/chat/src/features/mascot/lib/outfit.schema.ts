import { z } from "zod";

export const OutfitIdSchema = z.enum([
	"bare",
	"party",
	"dev",
	"propeller",
	"design",
	"bucket",
	"travel",
	"pith",
	"pilot",
	"writing",
	"newsboy",
	"eyeshade",
	"money",
	"crown",
	"sprout",
	"sweatband",
	"study",
	"wizard",
	"home",
	"toque",
]);

export type OutfitId = z.infer<typeof OutfitIdSchema>;
