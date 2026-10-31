import { createElement as h } from "react";
import type { ReactElement } from "react";
import { HeldTabsQuery } from "@widgetarium/app-host";
import { TaskRefSchema } from "@widgetarium/tasks";
import { useQuery } from "@widgetarium/core/requests";
import { BOARD_ADDRESS } from "../features/tasks/lib/use-open-task.js";
import { TasksPage } from "./tasks-page.js";

export interface TasksTabPageProps {
	readonly tabId: string | null;
}

export function TasksTabPage({ tabId }: TasksTabPageProps): ReactElement {
	const { tabs } = useQuery(HeldTabsQuery).data;
	const address = tabs.find((tab) => tab.id === tabId)?.address ?? BOARD_ADDRESS;
	return <TasksPage address={TaskRefSchema.safeParse(address).success ? address : BOARD_ADDRESS} />;
}
