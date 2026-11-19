import { createElement as h, memo, useMemo } from "react";
import { appHost } from "@widgetarium/app-host/contract";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { PaneCloseContext } from "@sumi/sumi-host-plugin";
import type { PanePlace, PaneRect } from "../../lib/pane-layout.js";
import type { SlotLook } from "../../lib/use-board-look.js";
import type { PaneLeaf, PaneView } from "@widgetarium/app-host/contract";
import { usePaneClosing } from "../../lib/use-pane-closing.js";
import { chatFacts } from "@sumi/chat-facts/contract";
import { PaneTools } from "../pane-tools/pane-tools.js";

export interface PaneSlotProps {
	readonly leaf: PaneLeaf;
	readonly look: SlotLook;
	readonly isClosable: boolean;
	readonly isExpanded: boolean;
	readonly onExpand: (paneId: string) => void;
	readonly drawn: (view: PaneView) => ReactNode;
	readonly onFocused: (paneId: string) => void;
}

const WHOLE_BOARD: PanePlace = {
	left: "0px",
	top: "0px",
	width: "100%",
	height: "100%",
};

export const PaneSlot = memo(function PaneSlot({
	leaf,
	look,
	isClosable,
	isExpanded,
	onExpand,
	drawn,
	onFocused,
}: PaneSlotProps): ReactElement {
	const { isDimmed, isMoving, isAway } = look;
	const { place, isAtTopLeft, isAtTopRight, corners } = isExpanded ? expandedLookOf(look) : look;
	const hasTools = isClosable && leaf.view.kind === "app";
	const close = usePaneClosing(leaf);
	const aimPane = useCommand(appHost.panes.aim);
	const markTabSeen = useCommand(chatFacts.turns.markSeen);
	const aim = (): void => {
		void aimPane.run({ id: leaf.id });
		onFocused(leaf.id);

		if (leaf.view.kind === "chat" && leaf.view.chatId !== undefined) {
			void markTabSeen.run({ id: leaf.view.chatId });
		}
	};
	const closing = useMemo(
		() => ({
			paneId: leaf.id,
			isAtTopLeft,
			isAtTopRight,
			isClosable,
			close,
		}),
		[close, leaf.id, isAtTopLeft, isAtTopRight, isClosable],
	);
	return (
		<div
			className="wg-pane"
			style={{
				left: place.left,
				top: place.top,
				width: place.width,
				height: place.height,
				...(corners === undefined ? {} : { "--wg-pane-corners": corners }),
			}}
			data-pane-id={leaf.id}
			data-pane-grouped={corners === undefined ? undefined : ""}
			data-pane-away={isAway ? "" : undefined}
			data-pane-view={leaf.view.kind}
			data-pane-tools={hasTools ? "" : undefined}
			data-pane-expanded={isExpanded ? "" : undefined}
			data-corner-start={isAtTopLeft ? "" : undefined}
			data-corner-end={isAtTopRight ? "" : undefined}
			data-pane-dimmed={isDimmed ? "" : undefined}
			data-pane-moving={isMoving ? "" : undefined}
			onPointerDownCapture={aim}
			onFocusCapture={() => onFocused(leaf.id)}
			onWheelCapture={isDimmed ? aim : undefined}
		>
			<PaneCloseContext.Provider value={closing}>{drawn(leaf.view)}</PaneCloseContext.Provider>
			{hasTools ? (
				<PaneTools paneId={leaf.id} isExpanded={isExpanded} onExpand={() => onExpand(leaf.id)} onClose={close} />
			) : null}
		</div>
	);
}, isSameSlot);

export function rectStyleOf(rect: PaneRect): CSSProperties {
	return {
		left: rect.left,
		top: rect.top,
		width: rect.width,
		height: rect.height,
	};
}

function expandedLookOf(look: SlotLook): SlotLook {
	return {
		...look,
		place: WHOLE_BOARD,
		isAtTopLeft: true,
		isAtTopRight: true,
		corners: undefined,
	};
}

function isSameSlot(before: PaneSlotProps, after: PaneSlotProps): boolean {
	return (
		before.leaf === after.leaf &&
		before.isClosable === after.isClosable &&
		before.isExpanded === after.isExpanded &&
		before.onExpand === after.onExpand &&
		before.drawn === after.drawn &&
		before.onFocused === after.onFocused &&
		isSameLook(before.look, after.look)
	);
}

function isSameLook(before: SlotLook, after: SlotLook): boolean {
	return (
		before.isAtTopLeft === after.isAtTopLeft &&
		before.isAtTopRight === after.isAtTopRight &&
		before.isDimmed === after.isDimmed &&
		before.isMoving === after.isMoving &&
		before.isAway === after.isAway &&
		before.corners === after.corners &&
		isSamePlace(before.place, after.place)
	);
}

function isSamePlace(before: PanePlace, after: PanePlace): boolean {
	return (
		before.left === after.left &&
		before.top === after.top &&
		before.width === after.width &&
		before.height === after.height
	);
}
