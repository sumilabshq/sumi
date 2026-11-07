import type { WindowServerOffers } from "@sumi/sumi-host-plugin";
import { localTransport } from "@widgetarium/data-framework";
import type { RemoteTransport } from "@widgetarium/data-framework";
import { server } from "@widgetarium/data-framework/server";
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

	server()
		.modules(...modules.map(({ moduleOf }) => moduleOf(offers)))
		.listen(transport)
		.start({
			env: {},
			scope: {
				workspaceId: offers.workspaceId,
			},
		});
	console.info(
		`[widgetarium] window server of ${offers.workspaceId}: none → serving ${modules.map(({ id }) => id).join(", ")}`,
	);
	return transport;
}
