import { createElement as h, useState } from "react";
import type { ReactNode } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { sessions } from "@sumi/sessions/contract";
import type { SessionRow as SessionRowData } from "@sumi/sessions/contract";
import { Icon, PopoverItem } from "@widgetarium/kit";
import { useTabFace } from "@sumi/sumi-host-plugin";

const ARCHIVE = "Archive";
const UNARCHIVE = "Unarchive";
const DELETE = "Delete";
const CONFIRM_DELETE = "Delete?";
const ICON_PX = 14;

export interface SessionRowProps {
	readonly row: SessionRowData;
	readonly isCurrent: boolean;
	readonly isArchived: boolean;
	onClose(): void;
}

export function SessionRow({ row, isCurrent, isArchived, onClose }: SessionRowProps): ReactNode {
	const TabFace = useTabFace();
	const [isConfirming, setConfirming] = useState(false);
	const open = useCommand(sessions.sessionOpening.open);
	const archive = useCommand(sessions.sessionOpening.archive);
	const remove = useCommand(sessions.sessionOpening.remove);
	const isHere = row.workspaceId === null;
	return (
		<div className="sumi-sessions-line" data-current={isCurrent} onMouseLeave={() => setConfirming(false)}>
			<PopoverItem
				className="sumi-sessions-row"
				aria-current={isCurrent}
				onClick={() => {
					onClose();
					void open.run({ chatId: row.chatId, workspaceId: row.workspaceId });
				}}
			>
				<span className="sumi-sessions-row-icon" aria-hidden="true">
					<TabFace art="chat" favicon={null} title={row.title} address={null} mark="none" />
				</span>
				<span className="sumi-sessions-row-label">{row.title}</span>
				{row.workspaceName === null ? null : <span className="sumi-sessions-row-meta">{row.workspaceName}</span>}
			</PopoverItem>
			{isHere ? (
				<span className="sumi-sessions-actions">
					<button
						type="button"
						className="sumi-sessions-action"
						aria-label={isArchived ? UNARCHIVE : ARCHIVE}
						title={isArchived ? UNARCHIVE : ARCHIVE}
						onClick={() => void archive.run({ chatId: row.chatId, isArchived: !isArchived })}
					>
						<Icon name={isArchived ? "archive-restore" : "archive"} size={ICON_PX} />
					</button>
					<button
						type="button"
						className="sumi-sessions-action"
						data-confirming={isConfirming}
						aria-label={isConfirming ? CONFIRM_DELETE : DELETE}
						title={isConfirming ? CONFIRM_DELETE : DELETE}
						onClick={() => {
							if (!isConfirming) {
								setConfirming(true);
								return;
							}

							void remove.run({ chatId: row.chatId });
						}}
					>
						{isConfirming ? CONFIRM_DELETE : <Icon name="trash" size={ICON_PX} />}
					</button>
				</span>
			) : null}
		</div>
	);
}
