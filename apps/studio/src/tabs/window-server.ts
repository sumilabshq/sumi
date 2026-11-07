import type { WindowServerOffers } from "@sumi/sumi-host-plugin";
import { localTransport, runtime } from "@widgetarium/data-framework";
import type { RemoteTransport } from "@widgetarium/data-framework";
import type { WindowServerModule } from "../plugins/sumi-plugins.js";

export function startWindowServer(
	modules: readonly WindowServerModule[],
	offers: WindowServerOffers,
): RemoteTransport {
	const transport = localTransport();

	if (modules.length === 0) {
		console.info(`[widgetarium] window server of ${offers.workspaceId}: no plugin module → not started`);
		return transport;
	}

	const windowServer = runtime()
		.modules(...modules.map(({ moduleOf }) => moduleOf(offers)))
		.start({
			platform: "server",
			env: {},
			scope: {
				workspaceId: offers.workspaceId,
			},
		});
	transport.serve(windowServer);
	console.info(
		`[widgetarium] window server of ${offers.workspaceId}: none → serving ${modules.map(({ id }) => id).join(", ")}`,
	);
	return transport;
}
