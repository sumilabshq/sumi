import { createElement as h, useId, useState } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { InertButton } from "../inert-button/inert-button.js";
import type { ChatRowData } from "@widgetarium/workspaces";
import type { ChatMenuAt } from "../chat-menu/chat-menu.js";
import { ChatRow } from "./chat-row.js";

export interface ChatSectionProps {
	readonly label: string;
	readonly rows: readonly ChatRowData[];
	readonly renamingId: string | null;
	readonly onMenu: (at: ChatMenuAt) => void;
	readonly onRenamed: () => void;
}

const FOLD = "Fold {label}";
const SETTINGS = "{label} settings";
const FOLD_ICON_PX = 12;
const ACT_ICON_PX = 13;

export function ChatSection({ label, rows, renamingId, onMenu, onRenamed }: ChatSectionProps): ReactElement {
	const [isOpen, setOpen] = useState(true);
	const listId = useId();
	return (
		<section className="wg-ws-section" aria-label={label} data-ws-section={label}>
			<div className={`wg-ws-section-head${isOpen ? "" : " is-shut"}`}>
				<IconButton
					variant="ghost"
					className="wg-ws-section-fold"
					aria-expanded={isOpen}
					aria-controls={listId}
					label={FOLD.replace("{label}", label)}
					onClick={() => setOpen(!isOpen)}
				>
					<Icon name="chevron-down" size={FOLD_ICON_PX} />
				</IconButton>
				<span className="wg-ws-section-label">{label}</span>
				<span className="wg-ws-section-acts">
					<InertButton label={SETTINGS.replace("{label}", label)} className="wg-ws-section-act">
						<Icon name="sliders-vertical" size={ACT_ICON_PX} />
					</InertButton>
				</span>
			</div>
			<div id={listId} className="wg-ws-section-rows" hidden={!isOpen}>
				{rows.map((row) => (
					<ChatRow key={row.id} row={row} isRenaming={row.id === renamingId} onMenu={onMenu} onRenamed={onRenamed} />
				))}
			</div>
		</section>
	);
}
