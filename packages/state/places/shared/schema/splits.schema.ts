import { z } from "zod";

export const SPLIT_MOST_MEMBERS = 4;

export const SPLIT_LEAST_MEMBERS = 2;

export const SplitDirSchema = z.enum(["row", "column"]);

export type SplitDir = z.infer<typeof SplitDirSchema>;

export const SplitSideSchema = z.enum(["left", "right", "top", "bottom"]);

export type SplitSide = z.infer<typeof SplitSideSchema>;

export interface SplitLeaf {
	readonly kind: "tab";
	readonly tabId: string;
}

export interface SplitBranch {
	readonly kind: "branch";
	readonly id: string;
	readonly dir: SplitDir;
	readonly children: readonly SplitNode[];
	readonly shares: readonly number[];
}

export type SplitNode = SplitLeaf | SplitBranch;

export const SplitNodeSchema: z.ZodType<SplitNode> = z.lazy(() =>
	z.discriminatedUnion("kind", [
		z.object({ kind: z.literal("tab"), tabId: z.string().min(1) }),
		z.object({
			kind: z.literal("branch"),
			id: z.string().min(1),
			dir: SplitDirSchema,
			children: z.array(SplitNodeSchema).readonly(),
			shares: z.array(z.number().positive()).readonly(),
		}),
	]),
);

export const KeptSplitSchema = z.object({
	id: z.string().min(1),
	memberIds: z.array(z.string().min(1)).readonly(),
	layout: SplitNodeSchema,
	focusedId: z.string().min(1),
});

export type KeptSplit = z.infer<typeof KeptSplitSchema>;

export const SplitCellSchema = z.object({
	tabId: z.string(),
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
});

export type SplitCell = z.infer<typeof SplitCellSchema>;

export const SplitMapSchema = z.object({
	cells: z.array(SplitCellSchema).readonly(),
	markedId: z.string(),
});

export type SplitMap = z.infer<typeof SplitMapSchema>;

export const SplitMarkSchema = z.object({
	id: z.string(),
	map: SplitMapSchema,
});

export type SplitMark = z.infer<typeof SplitMarkSchema>;
