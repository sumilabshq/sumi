import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { Icon, IconButton } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import { mainPageOf, shownTabOf } from "../../lib/page-entries.js";
import { useAssistant } from "../../lib/use-assistant.js";

const AI_ASSISTANT = "AI assistant";
const ICON_PX = 16;

export function AssistantButton(): ReactElement | null {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const shown = shownTabOf(sidebar);
	const main = shown === null ? null : (mainPageOf(sidebar, shown.id)?.page.tab.id ?? shown.id);
	const assistant = useAssistant(main);
	return assistant.isOffered ? (
		<IconButton variant="ghost" size="s" label={AI_ASSISTANT} title={AI_ASSISTANT} onClick={assistant.open}>
			<Icon name="sparkles" size={ICON_PX} />
		</IconButton>
	) : null;
}
