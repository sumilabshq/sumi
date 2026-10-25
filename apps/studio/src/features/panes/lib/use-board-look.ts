import { useRef } from "react";
import type { RefObject } from "react";
import { useOptionalQuery, useQuery } from "@widgetarium/core/requests";
import type { FrameBounds, PaneBoard, PaneLeaf, PaneNode, PanePlacement, PlacementPreview } from "@widgetarium/layout";
import { PaneTreeQuery, PlacementPreviewQuery } from "@widgetarium/layout";
import { focusedGroupOf } from "./aim-targets.js";
import { drawLayout } from "./draw-layout.js";
import { cornersOf, fixedPlaceOf, nodeWithId, paneLayoutOf, panePlacesOf } from "./pane-layout.js";
import type { PaneEdge, PaneLayout, PanePlace, PaneRect, PaneSpacing } from "./pane-layout.js";
import { useBoardBox } from "./use-board-box.js";
import { useLingering } from "./use-lingering.js";
import { useOpensChatAt } from "./use-opens-chat-at.js";
import { usePaneDrop } from "./use-pane-drop.js";
import { useSaysPreview } from "./use-says-preview.js";
import { useShowsActiveChat } from "./use-shows-active-chat.js";

type ChatGroup = PaneBoard["chatGroups"][number];

export interface BoardFraming {
	readonly chatPx: number;
	readonly bounds: FrameBounds;
}

export interface SlotLook {
	readonly place: PanePlace;
	readonly isAtTopLeft: boolean;
	readonly isAtTopRight: boolean;
	readonly isDimmed: boolean;
	readonly isMoving: boolean;
	readonly isAway: boolean;
	readonly corners: string | undefined;
}

export interface BoardLook {
	readonly tree: PaneBoard;
	readonly aim: PanePlacement | null;
	readonly isEasing: boolean;
	readonly edges: readonly PaneEdge[];
	readonly preview: PaneRect | undefined;
	readonly previewCorners: string | undefined;
	readonly groupPlaceOf: (group: ChatGroup) => PanePlace;
	readonly isGroupAway: (group: ChatGroup) => boolean;
	readonly slotOf: (leaf: PaneLeaf) => SlotLook;
	readonly drawDrag: (edge: PaneEdge, share: number) => void;
}

interface Focused {
	readonly tree: PaneBoard;
	readonly aim: PanePlacement | null;
	readonly focus: ChatGroup | null;
	readonly laidRoot: PaneNode | null;
	readonly isEasing: boolean;
	readonly resting: PaneLayout;
}

interface Measure {
	readonly box: PaneRect;
	readonly spacing: PaneSpacing;
}

interface Previewed {
	readonly previewed: PlacementPreview | null;
	readonly movingId: string | null;
	readonly shown: PaneLayout;
	readonly preview: PaneRect | undefined;
}

const GAP_PX = 8;
const FOCUS_EASE_MS = 260;
const EDGE_SLACK_PX = 1;

export function useBoardLook(board: RefObject<HTMLDivElement | null>, { chatPx, bounds }: BoardFraming): BoardLook {
	useShowsActiveChat();
	const measure: Measure = {
		box: useBoardBox(board),
		spacing: {
			gapPx: GAP_PX,
			leastPx: bounds.plateLeastPx,
		},
	};
	const focused = useFocusedLayout(board, measure);
	const { tree, focus, resting } = focused;
	useOpensChatAt(chatPx, paneLayoutOf(tree.root, measure.box, measure.spacing).edges, bounds.plateLeastPx);
	const seen = usePreviewed(board, focused, measure);
	const placeOf = placerOf(focused, seen, measure);
	return {
		tree,
		aim: focused.aim,
		isEasing: focused.isEasing,
		edges: resting.edges,
		preview: seen.preview,
		previewCorners: seen.preview === undefined ? undefined : previewCornersOf(seen, seen.preview),
		groupPlaceOf: (group) => placeOf(group.groupId),
		isGroupAway: (group) => focus !== null && focus.groupId !== group.groupId,
		slotOf: slotLooksOf(focused, seen, { box: measure.box, placeOf }),
		drawDrag: (edge, share) => drawDragged(board.current, tree.root, { ...measure, edge, share }),
	};
}

function useFocusedLayout(board: RefObject<HTMLDivElement | null>, { box, spacing }: Measure): Focused {
	const tree = useQuery(PaneTreeQuery).data;
	const offered = useRef<ReadonlyMap<string, PaneRect>>(new Map());
	const { aim, carriedHome } = usePaneDrop({ board, rects: offered, leaves: tree.leaves, groups: tree.chatGroups });
	const focus = focusedGroupOf(tree.chatGroups, carriedHome);
	const laidRoot = focus === null ? tree.root : nodeWithId(tree.root, focus.groupId);
	const isEasing = useLingering(focus !== null, FOCUS_EASE_MS);
	const resting = paneLayoutOf(laidRoot, box, spacing);
	offered.current = new Map([...resting.rects, ...resting.groups]);
	return {
		tree,
		aim,
		focus,
		laidRoot,
		isEasing,
		resting,
	};
}

function usePreviewed(board: RefObject<HTMLDivElement | null>, focused: Focused, measure: Measure): Previewed {
	const previewed = useOptionalQuery(PlacementPreviewQuery, focused.aim).data;
	const movingId = movingIdOf(previewed, focused.tree.leaves);
	const shown = shownLayoutOf(previewed, focused.focus, measure) ?? focused.resting;
	const preview = previewed === null || shown === focused.resting ? undefined : shown.rects.get(previewed.placedId);
	useSaysPreview(board, preview, movingId);
	return {
		previewed,
		movingId,
		shown,
		preview,
	};
}

function placerOf(
	focused: Focused,
	{ shown, preview }: Previewed,
	{ box, spacing }: Measure,
): (id: string) => PanePlace {
	const places = panePlacesOf({
		node: focused.laidRoot,
		box,
		spacing,
		dragged: null,
	});
	return (id) => {
		if (shown === focused.resting) {
			return places.get(id) ?? fixedPlaceOf(box);
		}

		return fixedPlaceOf(shown.rects.get(id) ?? shown.groups.get(id) ?? preview ?? box);
	};
}

function slotLooksOf(
	{ tree, focus, resting }: Focused,
	{ shown, movingId }: Previewed,
	{ box, placeOf }: { readonly box: PaneRect; readonly placeOf: (id: string) => PanePlace },
): (leaf: PaneLeaf) => SlotLook {
	const dimmedIds = dimmedIdsOf(tree.leaves, tree);
	const groupOfPane = new Map(
		tree.chatGroups.flatMap((group) => group.paneIds.map((id) => [id, group.groupId] as const)),
	);
	return (leaf) => {
		const restingRect = resting.rects.get(leaf.id);
		const groupId = groupOfPane.get(leaf.id);
		return {
			place: placeOf(leaf.id),
			isAtTopLeft: isAtTopLeft(restingRect),
			isAtTopRight: isAtTopRight(restingRect, box),
			isDimmed: dimmedIds.has(leaf.id),
			isMoving: leaf.id === movingId,
			isAway: focus !== null && !focus.paneIds.includes(leaf.id),
			corners: groupId === undefined ? undefined : cornersOf(shown.rects.get(leaf.id), shown.groups.get(groupId)),
		};
	};
}

function drawDragged(
	board: HTMLDivElement | null,
	root: PaneNode | null,
	{ box, spacing, edge, share }: Measure & { readonly edge: PaneEdge; readonly share: number },
): void {
	if (root === null || board === null) {
		return;
	}

	drawLayout(board, {
		node: root,
		box,
		spacing,
		dragged: {
			splitId: edge.splitId,
			at: edge.at,
			share,
		},
	});
}

function shownLayoutOf(
	previewed: PlacementPreview | null,
	focus: ChatGroup | null,
	{ box, spacing }: Measure,
): PaneLayout | null {
	if (previewed === null) {
		return null;
	}

	const laid = focus === null ? previewed.root : nodeWithId(previewed.root, focus.groupId);
	return paneLayoutOf(laid, box, spacing);
}

function dimmedIdsOf(
	leaves: readonly PaneLeaf[],
	{ targetId, chatTargetId }: Pick<PaneBoard, "targetId" | "chatTargetId">,
): ReadonlySet<string> {
	const apps = leaves.filter((leaf) => leaf.view.kind === "app");
	const chats = leaves.filter((leaf) => leaf.view.kind === "chat");
	const appTarget =
		apps.find((leaf) => leaf.id === targetId) ??
		apps.find((leaf) => leaf.view.kind === "app" && leaf.view.tabId === null) ??
		apps[0];
	return new Set([
		...othersThan(apps, appTarget),
		...othersThan(chats, chats.find((leaf) => leaf.id === chatTargetId) ?? chats[0]),
	]);
}

function othersThan(peers: readonly PaneLeaf[], target: PaneLeaf | undefined): readonly string[] {
	if (peers.length < 2 || target === undefined) {
		return [];
	}

	return peers.filter((leaf) => leaf.id !== target.id).map((leaf) => leaf.id);
}

function movingIdOf(previewed: PlacementPreview | null, leaves: readonly PaneLeaf[]): string | null {
	if (previewed === null || !leaves.some((leaf) => leaf.id === previewed.placedId)) {
		return null;
	}

	return previewed.placedId;
}

function isAtTopLeft(rect: PaneRect | undefined): boolean {
	return rect !== undefined && rect.top <= EDGE_SLACK_PX && rect.left <= EDGE_SLACK_PX;
}

function isAtTopRight(rect: PaneRect | undefined, box: PaneRect): boolean {
	return rect !== undefined && rect.top <= EDGE_SLACK_PX && rect.left + rect.width >= box.width - EDGE_SLACK_PX;
}

function previewCornersOf({ previewed, shown }: Previewed, preview: PaneRect): string | undefined {
	if (previewed === null) {
		return undefined;
	}

	const holding = [...shown.groups].find(
		([groupId]) => nodeWithId(nodeWithId(previewed.root, groupId), previewed.placedId) !== null,
	);
	return holding === undefined ? undefined : cornersOf(preview, holding[1]);
}
