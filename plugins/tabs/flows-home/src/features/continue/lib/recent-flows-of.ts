import type { OutputOf } from "@widgetarium/data-framework";
import type { navigation } from "@widgetarium/navigation/contract";

type Sidebar = OutputOf<typeof navigation.flows.sidebar>;

export interface RecentFlow {
	readonly id: string;
	readonly name: string;
	readonly folderName: string | null;
	readonly lastOpenedAt: number;
	readonly status: Sidebar["looseFlows"][number]["status"];
}

export function recentFlowsOf({ looseFlows, folders, windowFlowId }: Sidebar): readonly RecentFlow[] {
	const loose = looseFlows.map((flow) => ({ flow, folderName: null }));
	const foldered = folders.flatMap(({ name, flows }) => flows.map((flow) => ({ flow, folderName: name })));
	return [...loose, ...foldered]
		.filter(({ flow }) => flow.id !== windowFlowId)
		.map(({ flow, folderName }) => ({
			id: flow.id,
			name: flow.name,
			folderName,
			lastOpenedAt: flow.lastOpenedAt,
			status: flow.status,
		}))
		.sort((first, second) => second.lastOpenedAt - first.lastOpenedAt);
}
