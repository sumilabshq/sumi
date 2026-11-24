import { flowBoard } from "@sumi/flow-board-plugin";
import { backend } from "@sumi/sumi-host-plugin";
import { homeLayout as homeLayoutContract } from "@sumi/home-layout/contract";
import { homeLayout as homeLayoutModule } from "@sumi/home-layout/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { FlowsHome } from "./features/home/ui/flows-home/flows-home.js";

export const flowsHome = plugin("flows-home")
	.require(backend, flowBoard)
	.apply((app) => {
		app.use(backend).moduleOf(({ store }) => homeLayoutModule({ store }), homeLayoutContract);
		app.use(flowBoard).slots.home.replace(FlowsHome);
	});
