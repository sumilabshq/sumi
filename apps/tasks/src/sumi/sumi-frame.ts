import { appearance, places } from "@sumi/contract";
import { tasks } from "@widgetarium/tasks";
import { runtime, messagePortTransport, portFromParent } from "@widgetarium/data-framework";
import type { RemoteTransport, Runtime } from "@widgetarium/data-framework";

const TAB_KEY = "sumi-tab";

export interface SumiFrame {
	readonly sumi: Runtime;
	readonly transport: RemoteTransport;
	readonly tabId: string;
}

export async function startSumiFrame(): Promise<SumiFrame> {
	const transport = messagePortTransport(await portFromParent());
	return {
		sumi: runtime()
			.imports(places({ over: transport }), appearance({ over: transport }), tasks({ over: transport }))
			.start(),
		transport,
		tabId: new URLSearchParams(location.hash.slice(1)).get(TAB_KEY) ?? "",
	};
}
