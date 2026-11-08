import { AuthenticatedGuard, Server, module } from "@widgetarium/data-framework";
import { fileSystemPartsOn } from "./gateways/file-system-parts/file-system-parts.gateway.js";
import { FileAccessGuard, FileCallLoggerMiddleware } from "./features/files/requests.js";
import { handled } from "./generated/handled.js";

export const fileSystem = module()
	.on(Server)
	.guard(AuthenticatedGuard)
	.guard(FileAccessGuard)
	.use(FileCallLoggerMiddleware)
	.provide((facts) => fileSystemPartsOn(facts))
	.handles(handled);
