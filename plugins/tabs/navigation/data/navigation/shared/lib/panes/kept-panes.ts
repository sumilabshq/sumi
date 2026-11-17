import { PaneTreeSchema } from "../../schema/pane-tree.schema.js";
import type { PaneNode, PaneTree, PaneView } from "../../schema/pane-tree.schema.js";
import { groupedChat, withChatsGrouped } from "./chat-groups.js";

const MINTED_ID = /^pane-(\d+)(?:-|$)/;
const TORN_PANE = "pane-torn";

export const EMPTY_PANES: PaneTree = {
	root: null,
	minted: 0,
	targetId: null,
};

export const FIRST_PANES: PaneTree = {
	root: {
		kind: "split",
		id: "pane-root",
		dir: "row",
		shares: [0.5, 0.5],
		children: [
			{
				kind: "pane",
				id: "pane-chat",
				view: { kind: "chat" },
			},
			{
				kind: "pane",
				id: "pane-app",
				view: {
					kind: "app",
					tabId: null,
				},
			},
		],
	},
	minted: 0,
	targetId: null,
};

export const KeptPaneTreeSchema = PaneTreeSchema.superRefine((tree, context) => {
	for (const message of paneTreeFaultsOf(tree)) {
		context.addIssue({
			code: "custom",
			message,
		});
	}
}).transform(withChatsGrouped);

export function keptPanesOf(kept: unknown): PaneTree | null {
	if (kept === undefined || kept === null) {
		return null;
	}

	const parsed = KeptPaneTreeSchema.safeParse(kept);

	if (!parsed.success) {
		console.warn("[widgetarium] kept panes refused, so the board starts from the first panes", parsed.error.issues);
		return null;
	}

	return parsed.data;
}

export function firstPanesOf(boot: PaneView | null): PaneTree {
	if (boot === null) {
		return FIRST_PANES;
	}

	if (boot.kind === "chat" && boot.chatId !== undefined) {
		return {
			root: groupedChat({ kind: "pane", id: TORN_PANE, view: boot }, boot.chatId),
			minted: 0,
			targetId: null,
			chatTargetId: TORN_PANE,
		};
	}

	return {
		root: {
			kind: "pane",
			id: TORN_PANE,
			view: boot,
		},
		minted: 0,
		targetId: TORN_PANE,
	};
}

function paneTreeFaultsOf(tree: PaneTree): string[] {
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

	const { id, children, shares, chatId } = node;
	const chatLeaves = nodesOf(node).filter((one) => one.kind === "pane" && one.view.kind === "chat");
	const sum = shares.reduce((total, share) => total + share, 0);
	const faults: readonly (readonly [boolean, string])[] = [
		[shares.length !== children.length, `split ${id} holds ${children.length} children and ${shares.length} shares`],
		[
			children.length < (chatId === undefined ? 2 : 1),
			`split ${id} holds ${children.length} children, too few for its kind`,
		],
		[
			chatId !== undefined &&
				!chatLeaves.some((one) => one.kind === "pane" && one.view.kind === "chat" && one.view.chatId === chatId),
			`chat group ${id} holds no pane of chat ${chatId ?? ""}`,
		],
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
