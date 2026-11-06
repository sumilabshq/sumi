import { event, gatewayEvent } from "@widgetarium/data-framework";
import { DesignAppSchema } from "../../shared/schema/design-app.schema.js";
import { DesignFolderGateway } from "./design-folder.gateway.js";

export const DesignChangedEvent = event("design-changed")
	.input(DesignAppSchema)
	.from(gatewayEvent(DesignFolderGateway, (gateway, fire) => gateway.designChanged((app) => fire({ app }))));
