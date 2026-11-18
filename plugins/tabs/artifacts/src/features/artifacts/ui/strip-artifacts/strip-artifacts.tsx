import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Icon, Popover, PopoverContent, PopoverItem, PopoverTrigger } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import { TabIcons } from "@sumi/tab-strip-plugin";
import { chatEntryOf } from "../../lib/chat-entries.js";

export interface StripArtifactsProps {
	readonly tabId: string;
}

const LIST = "Artifacts of {title}";
const CHEVRON_PX = 12;

export function StripArtifacts({ tabId }: StripArtifactsProps): ReactElement | null {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const showTab = useCommand(appHost.tabs.showTab);
	const [isOpen, setOpen] = useState(false);
	const chat = chatEntryOf(sidebar, tabId);

	if (chat === null || chat.artifacts.length === 0) {
		return null;
	}

	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="sumi-artifacts-chevron"
					aria-label={LIST.replace("{title}", chat.tab.title)}
					aria-expanded={isOpen}
					data-open={isOpen ? "" : undefined}
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => event.stopPropagation()}
				>
					<Icon name="chevron-down" size={CHEVRON_PX} />
				</button>
			</PopoverTrigger>
			<PopoverContent side="bottom" align="start" className="is-compact sumi-artifacts-menu">
				<div role="menu" aria-label={LIST.replace("{title}", chat.tab.title)}>
					{chat.artifacts.map(({ tab }) => (
						<PopoverItem
							key={tab.id}
							role="menuitem"
							checked={tab.isShown}
							onClick={() => {
								setOpen(false);
								void showTab.run({ id: tab.id });
							}}
						>
							<TabIcons item={{ kind: "tab", tab, list: tabId, groupId: null, group: null }} />
							<span className="sumi-artifacts-title">{tab.title}</span>
						</PopoverItem>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
