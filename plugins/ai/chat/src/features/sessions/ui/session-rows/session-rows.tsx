import { createElement as h, Fragment } from "react";
import type { ReactNode } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { Icon, PopoverSeparator } from "@widgetarium/kit";
import { useTabFace } from "@sumi/sumi-host-plugin";
import { ControlMenuRow } from "@sumi/control-menu-plugin";
import { commandMenu } from "@sumi/command-menu/contract";

const SESSIONS = "Sessions";
const NEW_SESSION = "New session";
const ALL_SESSIONS = "All sessions";
const SESSIONS_DOOR = "sessions";
const SESSIONS_SHOWN = 5;
const ICON_PX = 16;
const STATUS_OF = {
	none: null,
	running: "working",
	unread: "new",
} as const;

export function SessionRows(): ReactNode {
	const TabFace = useTabFace();
	const list = useOptionalQuery(chatTabs.chatList.all).data;
	const openNew = useCommand(chatTabs.chatOpening.openNew);
	const showTab = useCommand(appHost.tabs.showTab);
	const openMenu = useCommand(commandMenu.opening.toggle);
	const doors = useOptionalQuery(commandMenu.opening.doors).data?.doors ?? [];
	const rows = [...(list?.pinned ?? []), ...(list?.recents ?? [])].slice(0, SESSIONS_SHOWN);
	return (
		<>
			<div className="wg-kit-menu-label">{SESSIONS}</div>
			<ControlMenuRow
				label={NEW_SESSION}
				keys={null}
				icon={<Icon name="plus" size={ICON_PX} />}
				onRun={() => void openNew.run({ title: null })}
			/>
			{rows.map((row) => (
				<ControlMenuRow
					key={row.id}
					label={row.title}
					keys={STATUS_OF[row.mark]}
					icon={<TabFace art="chat" favicon={null} title={row.title} address={null} mark={row.mark} />}
					onRun={() => void showTab.run({ id: row.id, paneId: null, isFollowingFocus: false })}
				/>
			))}
			<ControlMenuRow
				label={ALL_SESSIONS}
				keys={doors.find(({ id }) => id === SESSIONS_DOOR)?.keys ?? null}
				icon={<Icon name="search" size={ICON_PX} />}
				onRun={() => void openMenu.run({ door: SESSIONS_DOOR, text: "" })}
			/>
			<PopoverSeparator />
		</>
	);
}
