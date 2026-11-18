import { z } from "zod";

const RevisionSchema = z
	.string()
	.min(1)
	.max(256)
	.regex(/^[^\s-][^\s]*$/);

const OnlySchema = z.union([z.literal("uncommitted"), RevisionSchema]);

export const ShowChangesAskSchema = z.object({
	folder: z.string().min(1).max(4096).startsWith("/").describe("Absolute path of the repository, or a folder inside it"),
	only: OnlySchema.nullable()
		.default("uncommitted")
		.describe("\"uncommitted\" for the working changes, a commit for that one commit, null to compare base and head"),
	base: RevisionSchema.nullable().default(null).describe("With only null: the side to compare from, a branch or commit; null is HEAD"),
	head: RevisionSchema.nullable().default(null).describe("With only null: the side to compare to, a branch or commit; null is what is checked out"),
	paths: z
		.array(z.string().min(1).max(4096))
		.max(200)
		.default([])
		.describe("Show only these files, paths relative to the repository; empty shows every changed file"),
});

export const ShownChangesSchema = z.object({
	folder: z.string(),
	only: OnlySchema.nullable(),
	base: RevisionSchema.nullable(),
	head: RevisionSchema.nullable(),
	paths: z.array(z.string()),
	label: z.string(),
	link: z.string(),
});
