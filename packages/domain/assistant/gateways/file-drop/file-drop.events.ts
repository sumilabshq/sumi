import { event, gatewayEvent } from "@widgetarium/framework";
import { FileDragEventSchema } from "../../shared/schema/file-drag.schema.js";
import { FileDropGateway } from "./file-drop.gateway.js";

export const FileDraggedEvent = event("file-dragged")
	.input(FileDragEventSchema)
	.from(gatewayEvent(FileDropGateway, (gateway, fire) => gateway.fileDragged(fire)));
