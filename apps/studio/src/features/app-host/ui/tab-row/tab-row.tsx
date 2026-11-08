import { createElement as h, memo } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement } from "react";
import type { SidebarTab } from "@widgetarium/app-host";
import { CHAT_TAB_ICON_HOST } from "../../../mascot/ui/chat-tab-icon/chat-tab-icon.js";
import { FOLD_HOST_ROW, ROW_WORDS, SIDEBAR_ROW, SIDEBAR_ROW_SHOWN } from "../../lib/tabs-look/tabs-look.js";
import { rowFaceOf } from "../../lib/tabs-sidebar/row-face.js";
import { useRowPick } from "../../lib/tabs-sidebar/use-row-pick.js";
import { DropTint } from "../drop-tint/drop-tint.js";
import { RenameField } from "../rename-field/rename-field.js";
import { LIFTED_HIDDEN, useLiftedMark } from "../../lib/tab-drag/lifted-look.js";
import { RowIcon } from "./row-icon.js";
import { RowTail } from "./row-tail.js";
import type { RowBadge } from "./row-badge.js";
import type { RowFold } from "./fold-chevron.js";

export type RowPlace = "top" | "child";

export interface TabRowProps {
	readonly item: SidebarTab;
	readonly groupId: string | null;
	readonly splitId?: string | null;
	readonly place: RowPlace;
	readonly isRenaming: boolean;
	readonly onRenamed: () => void;
	readonly badge?: RowBadge | null;
	readonly fold?: RowFold | null;
}

const MIDDLE_BUTTON = 1;
const RENAME_FIELD =
	"cv:h-6 cv:min-w-0 cv:flex-1 cv:rounded-[6px] cv:border-0 cv:bg-(--sumi-plate) cv:px-1.5 cv:font-[inherit] cv:text-[13px] cv:text-(--sumi-text) cv:[box-shadow:inset_0_0_0_1.5px_var(--sumi-accent)] cv:outline-none";
const ROW_RADIUS_PX = 10;

export const TabRow = memo(function TabRow({
	item,
	groupId,
	splitId = null,
	place,
	isRenaming,
	onRenamed,
	badge,
	fold = null,
}: TabRowProps): ReactElement {
	const face = rowFaceOf(item);
	const { show, close } = useRowPick(item);
	const isHolder = item.children !== undefined;
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
			className={[SIDEBAR_ROW, SIDEBAR_ROW_SHOWN, isHolder && CHAT_TAB_ICON_HOST, fold && FOLD_HOST_ROW]
				.filter(Boolean)
				.join(" ")}
			onClick={show}
			onKeyDown={onKeyDown}
			onAuxClick={(event: MouseEvent) => {
				if (event.button === MIDDLE_BUTTON) close?.();
			}}
			data-shown={face.isShown || undefined}
			data-tabs-item="tab"
			data-tabs-id={face.id}
			data-tabs-group={groupId ?? undefined}
			data-tabs-chat={isHolder ? face.id : undefined}
			data-tabs-nestable={face.isNestable ? "" : undefined}
			data-tabs-tearable={face.isTearable ? "" : undefined}
			data-tabs-place={place}
			data-host-list-tab={face.id}
			data-host-tab-app={face.app}
			data-tabs-lifted={lifted === null ? undefined : ""}
			style={lifted === null ? undefined : LIFTED_HIDDEN}
		>
			{lifted === null ? null : <DropTint isOn={lifted.isMarked} radius={ROW_RADIUS_PX} />}
			<RowIcon item={item} />
			{isRenaming ? (
				<RenameField named={face} className={RENAME_FIELD} onDone={onRenamed} />
			) : (
				<span className={ROW_WORDS} data-tabs-words="">
					{face.title}
				</span>
			)}
			<RowTail face={face} badge={badge ?? null} onClose={close} fold={fold} />
		</div>
	);
});
