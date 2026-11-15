import { createElement as h, memo } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement } from "react";
import type { SidebarTab } from "@widgetarium/app-host/contract";
import { CHAT_TAB_ICON_HOST } from "../../../mascot/ui/chat-tab-icon/chat-tab-icon.js";
import { ROW_WORDS, SIDEBAR_ROW, SIDEBAR_ROW_SHOWN } from "../../lib/tabs-look/tabs-look.js";
import { rowFaceOf } from "../../lib/tabs-sidebar/row-face.js";
import { useRowPick } from "../../lib/tabs-sidebar/use-row-pick.js";
import { DropTint } from "../drop-tint/drop-tint.js";
import { TabRenameField } from "../rename-field/tab-rename-field.js";
import { LIFTED_HIDDEN, useLiftedMark } from "../../lib/tab-drag/lifted-look.js";
import { RowIcon } from "./row-icon.js";
import { RowTail } from "./row-tail.js";
import type { RowBadge } from "./row-badge.js";

export interface TabRowProps {
	readonly item: SidebarTab;
	readonly groupId: string | null;
	readonly splitId?: string | null;
	readonly isRenaming: boolean;
	readonly onRenamed: () => void;
	readonly badge?: RowBadge | null;
}

const MIDDLE_BUTTON = 1;
const ROW_RADIUS_PX = 0;

export const TabRow = memo(function TabRow({
	item,
	groupId,
	splitId = null,
	isRenaming,
	onRenamed,
	badge,
}: TabRowProps): ReactElement {
	const face = rowFaceOf(item);
	const { show, close } = useRowPick(item);
	const lifted = useLiftedMark(face.id, splitId);
	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
		if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
			event.preventDefault();
			show();
		}
	};
	return (
		<div
			role="button"
			tabIndex={0}
			aria-current={face.isShown || undefined}
			className={[SIDEBAR_ROW, SIDEBAR_ROW_SHOWN, item.isChat && CHAT_TAB_ICON_HOST].filter(Boolean).join(" ")}
			onClick={show}
			onKeyDown={onKeyDown}
			onAuxClick={(event: MouseEvent) => {
				if (event.button === MIDDLE_BUTTON) close?.();
			}}
			data-shown={face.isShown || undefined}
			data-tabs-item="tab"
			data-tabs-id={face.id}
			data-tabs-group={groupId ?? undefined}
			data-tabs-chat={item.isChat ? face.id : undefined}
			data-host-list-tab={face.id}
			data-host-tab-app={face.app}
			data-tabs-lifted={lifted === null ? undefined : ""}
			style={lifted === null ? undefined : LIFTED_HIDDEN}
		>
			{lifted === null ? null : <DropTint isOn={lifted.isMarked} radius={ROW_RADIUS_PX} />}
			<RowIcon item={item} />
			{isRenaming ? (
				<TabRenameField named={face} onDone={onRenamed} />
			) : (
				<span className={ROW_WORDS} data-tabs-words="">
					{face.title}
				</span>
			)}
			<RowTail face={face} badge={badge ?? null} onClose={close} />
		</div>
	);
});
