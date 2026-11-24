import { navigation } from "@sumi/navigation-plugin";
import { shell, sumiHost } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { FlowStrip } from "./features/flow-header/ui/flow-strip/flow-strip.js";
import { flowWindowProviderOf } from "./shared/ui/flow-window-provider/flow-window-provider.js";

export const flowStrip = plugin("flow-strip")
	.require(sumiHost, shell, navigation)
	.apply((app) => {
		app.use(shell).provider(flowWindowProviderOf);
		app.use(sumiHost).slots.titleTabs.add(FlowStrip);
	});
