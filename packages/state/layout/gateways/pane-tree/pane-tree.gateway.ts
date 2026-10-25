import { PaneTreeSchema } from "../../shared/schema/pane-tree.schema.js";
import { withChatsGrouped } from "../../shared/lib/chat-groups.js";
import type { PaneNode, PaneTree } from "../../shared/schema/pane-tree.schema.js";

export abstract class PaneTreeGateway {
	abstract tree(): PaneTree;
	abstract saveTree(tree: PaneTree, reason: string): void;
	abstract treeChanged(listener: () => void): () => void;
}

const MINTED_ID = /^pane-(\d+)(?:-|$)/;

export const KeptPaneTreeSchema = PaneTreeSchema.superRefine((tree, context) => {
	for (const message of paneTreeFaultsOf(tree)) {
		context.addIssue({
			code: "custom",
			message,
		});
	}
}).transform(withChatsGrouped);

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
