import { createElement as h, memo } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { ROW_WORDS, SIDEBAR_ROW, SIDEBAR_ROW_SHOWN } from "../../../../shared/lib/tabs-look/tabs-look.js";
import type { AppTabState } from "../../../../shared/schema/app-tab.schema.js";
import { TabArt } from "../../../../shared/ui/tab-face/tab-art.js";
import { CloseTabCommand, ShowTabCommand } from "../../contract.js";
import { RenameField } from "../rename-field/rename-field.js";
import { TabRowClose } from "./tab-row-close.js";
import { TabRowOwnWindow } from "./tab-row-own-window.js";

export interface TabRowProps {
	readonly tab: AppTabState;
	readonly groupId: string | null;
	readonly isRenaming: boolean;
	readonly onRenamed: () => void;
}

const MIDDLE_BUTTON = 1;
const RENAME_FIELD =
	"cv:h-6 cv:min-w-0 cv:flex-1 cv:rounded-[6px] cv:border-0 cv:bg-(--sumi-plate) cv:px-1.5 cv:font-[inherit] cv:text-[13px] cv:text-(--sumi-text) cv:[box-shadow:inset_0_0_0_1.5px_var(--sumi-accent)] cv:outline-none";

export const TabRow = memo(function TabRow({ tab, groupId, isRenaming, onRenamed }: TabRowProps): ReactElement {
	const showTab = useCommand(ShowTabCommand);
	const closeTab = useCommand(CloseTabCommand);
	const show = (): void => void showTab.run({ id: tab.id });
	const close = (): void => void closeTab.run({ id: tab.id });
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
			aria-current={tab.isShown || undefined}
			draggable={!isRenaming}
			className={`${SIDEBAR_ROW} ${SIDEBAR_ROW_SHOWN}`}
			onClick={show}
			onKeyDown={onKeyDown}
			onAuxClick={(event: MouseEvent) => {
				if (event.button === MIDDLE_BUTTON) close();
			}}
			data-shown={tab.isShown || undefined}
			data-tabs-item="tab"
			data-tabs-id={tab.id}
			data-tabs-group={groupId ?? undefined}
			data-host-list-tab={tab.id}
			data-host-tab-app={tab.app}
		>
			<TabArt icon={tab.icon} favicon={tab.favicon} title={tab.title} address={tab.address} size="row" />
			{isRenaming ? (
				<RenameField tab={tab} className={RENAME_FIELD} onDone={onRenamed} />
			) : (
				<span className={ROW_WORDS} data-tabs-words="">
					{tab.title}
				</span>
			)}
			{tab.isInOwnWindow ? <TabRowOwnWindow /> : null}
			<TabRowClose title={tab.title} tabId={tab.id} onClose={close} />
		</div>
	);
});
