import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { Icon } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import { ControlMenuRow, useControlMenu } from "@sumi/control-menu-plugin";
import { mainPageOf, shownTabOf } from "../../lib/page-entries.js";
import { useAssistant } from "../../lib/use-assistant.js";

const OPEN_AI_ASSISTANT = "Open AI assistant";

export function AssistantRow(): ReactElement | null {
	const sidebar = useQuery(appHost.tabs.tabsSidebar).data;
	const menu = useControlMenu();
	const shown = shownTabOf(sidebar);
	const main = shown === null ? null : (mainPageOf(sidebar, shown.id)?.page.tab.id ?? shown.id);
	const assistant = useAssistant(main);
	return assistant.isOffered ? (
		<ControlMenuRow
			label={OPEN_AI_ASSISTANT}
			keys={null}
			icon={<Icon name="sparkles" />}
			onRun={() => {
				menu.close();
				assistant.open();
			}}
		/>
	) : null;
}
