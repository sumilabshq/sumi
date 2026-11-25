import type { OutputOf } from "@widgetarium/data-framework";
import type { navigation } from "@widgetarium/navigation/contract";

export type FlowBoard = NonNullable<OutputOf<typeof navigation.flowPanes.board>>;

export type FlowTab = FlowBoard["tabs"][number];
