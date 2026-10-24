import { z } from "zod";

export const PaneViewSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("chat") }),
	z.object({
		kind: z.literal("app"),
		tabId: z.string().nullable(),
	}),
]);

export type PaneView = z.infer<typeof PaneViewSchema>;

export const PaneSideSchema = z.enum(["left", "right", "top", "bottom"]);

export type PaneSide = z.infer<typeof PaneSideSchema>;

export const SplitDirSchema = z.enum(["row", "column"]);

export type SplitDir = z.infer<typeof SplitDirSchema>;

export interface PaneLeaf {
	readonly kind: "pane";
	readonly id: string;
	readonly view: PaneView;
}

export interface PaneSplit {
	readonly kind: "split";
	readonly id: string;
	readonly dir: SplitDir;
	readonly children: readonly PaneNode[];
	readonly shares: readonly number[];
}

export type PaneNode = PaneLeaf | PaneSplit;

const PaneLeafSchema = z.object({
	kind: z.literal("pane"),
	id: z.string(),
	view: PaneViewSchema,
});

export const PaneNodeSchema: z.ZodType<PaneNode> = z.lazy(() =>
	z.discriminatedUnion("kind", [
		PaneLeafSchema,
		z.object({
			kind: z.literal("split"),
			id: z.string(),
			dir: SplitDirSchema,
			children: z.array(PaneNodeSchema).readonly(),
			shares: z.array(z.number().nonnegative()).readonly(),
		}),
	]),
);

const PaneTreeShapeSchema = z.object({
	root: PaneNodeSchema.nullable(),
	minted: z.number().int().nonnegative(),
	targetId: z.string().nullable(),
});

type PaneTreeShape = z.infer<typeof PaneTreeShapeSchema>;

const MINTED_ID = /^pane-(\d+)(?:-|$)/;

export const PaneTreeSchema = PaneTreeShapeSchema.superRefine((tree, context) => {
	for (const message of paneTreeFaultsOf(tree)) {
		context.addIssue({
			code: "custom",
			message,
		});
	}
});

export type PaneTree = z.infer<typeof PaneTreeSchema>;

function paneTreeFaultsOf(tree: PaneTreeShape): string[] {
	const nodes = nodesOf(tree.root);
	return [
		...nodes.flatMap(splitFaultsOf),
		...repeatedIdFaultsOf(nodes),
		...mintedFaultsOf(tree.minted, nodes),
		...targetFaultsOf(tree.targetId, nodes),
	];
}

function nodesOf(node: PaneNode | null): PaneNode[] {
	if (node === null) {
		return [];
	}

	return node.kind === "pane" ? [node] : [node, ...node.children.flatMap(nodesOf)];
}

function splitFaultsOf(node: PaneNode): string[] {
	if (node.kind === "pane") {
		return [];
	}

	const { id, children, shares } = node;
	const sum = shares.reduce((total, share) => total + share, 0);
	const faults: readonly (readonly [boolean, string])[] = [
		[shares.length !== children.length, `split ${id} holds ${children.length} children and ${shares.length} shares`],
		[children.length < 2, `split ${id} holds ${children.length} child; a split holds two or more`],
		[sum <= 0, `split ${id} has shares summing to ${sum}`],
	];
	return faults.flatMap(([isFault, message]) => (isFault ? [message] : []));
}

function repeatedIdFaultsOf(nodes: readonly PaneNode[]): string[] {
	const seen = new Set<string>();
	return nodes.flatMap(({ id }) => {
		const isRepeated = seen.has(id);
		seen.add(id);
		return isRepeated ? [`id ${id} stands on the board twice`] : [];
	});
}

function mintedFaultsOf(minted: number, nodes: readonly PaneNode[]): string[] {
	const highest = Math.max(0, ...nodes.map(({ id }) => Number(MINTED_ID.exec(id)?.[1] ?? 0)));
	return minted >= highest ? [] : [`minted ${minted} is below pane-${highest}, so the next pane would take a held id`];
}

function targetFaultsOf(targetId: string | null, nodes: readonly PaneNode[]): string[] {
	const isLeaf = nodes.some((node) => node.kind === "pane" && node.id === targetId);
	return targetId === null || isLeaf ? [] : [`targetId ${targetId} names no pane`];
}
