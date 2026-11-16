import { createElement as h, Fragment, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { sessions } from "@sumi/sessions/contract";
import type { SessionPage } from "@sumi/sessions/contract";
import { Icon, PopoverItem } from "@widgetarium/kit";
import { sessionGroupsOf } from "../../lib/session-groups.js";
import { useLoadsMore } from "../../lib/use-loads-more.js";
import { SessionRow } from "../session-row/session-row.js";

const NEW_SESSION = "New session";
const NOTHING_FOUND = "No sessions found";
const READING = "Reading sessions…";
const ARCHIVED = "Archived ({count})";
const BACK = "Back to sessions";
const PAGE_ROWS = 30;
const ICON_PX = 16;

export interface SessionRowsProps {
	readonly needle: string;
	readonly isArchived: boolean;
	readonly currentChatId: string | null;
	onArchivedShown(isShown: boolean): void;
	onClose(): void;
}

export function SessionRows({ needle, isArchived, currentChatId, onArchivedShown, onClose }: SessionRowsProps): ReactNode {
	const [limit, setLimit] = useState(PAGE_ROWS);
	const read = useOptionalQuery(sessions.sessionList.page, { text: needle, limit, isArchived }).data;
	const lastRead = useRef<SessionPage | undefined>(read);
	lastRead.current = read ?? lastRead.current;
	const { rows, hasMore, archivedCount } = lastRead.current ?? { rows: [], hasMore: false, archivedCount: 0 };
	const isRead = lastRead.current?.isRead === true;
	const openNew = useCommand(chatTabs.chatOpening.openNew);
	const moreRef = useLoadsMore(() => setLimit(rows.length + PAGE_ROWS));
	const groups = sessionGroupsOf(rows, Date.now());
	return (
		<>
			{isArchived ? (
				<PopoverItem className="sumi-sessions-row" onClick={() => onArchivedShown(false)}>
					<span className="sumi-sessions-row-icon" aria-hidden="true">
						<Icon name="arrow-left" size={ICON_PX} />
					</span>
					<span className="sumi-sessions-row-label">{BACK}</span>
				</PopoverItem>
			) : (
				<PopoverItem
					className="sumi-sessions-row"
					onClick={() => {
						onClose();
						void openNew.run({ title: null });
					}}
				>
					<span className="sumi-sessions-row-icon" aria-hidden="true">
						<Icon name="plus" size={ICON_PX} />
					</span>
					<span className="sumi-sessions-row-label">{NEW_SESSION}</span>
				</PopoverItem>
			)}
			{isRead ? null : <div className="wg-kit-menu-label">{READING}</div>}
			{isRead && rows.length === 0 ? <div className="wg-kit-menu-label">{NOTHING_FOUND}</div> : null}
			{groups.map(({ label, rows: grouped }) => (
				<Fragment key={label}>
					<div className="wg-kit-menu-label">{label}</div>
					{grouped.map((row) => (
						<SessionRow
							key={`${row.workspaceId ?? ""}:${row.chatId}`}
							row={row}
							isCurrent={row.workspaceId === null && row.chatId === currentChatId}
							isArchived={isArchived}
							onClose={onClose}
						/>
					))}
				</Fragment>
			))}
			{hasMore ? <div key={rows.length} ref={moreRef} className="sumi-sessions-more" /> : null}
			{!isArchived && archivedCount > 0 ? (
				<PopoverItem className="sumi-sessions-row" onClick={() => onArchivedShown(true)}>
					<span className="sumi-sessions-row-icon" aria-hidden="true">
						<Icon name="archive" size={ICON_PX} />
					</span>
					<span className="sumi-sessions-row-label">
						{ARCHIVED.replace("{count}", String(archivedCount))}
					</span>
				</PopoverItem>
			) : null}
		</>
	);
}
