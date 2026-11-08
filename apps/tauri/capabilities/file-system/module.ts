import { AuthenticatedGuard, Server, module } from "@widgetarium/data-framework";
import { fileSystemPartsOn } from "./gateways/file-system-parts/file-system-parts.gateway.js";
import { FileAccessGuard, FileCallLoggerMiddleware } from "./features/files/requests.js";

export const fileSystem = module("file-system")
	.on(Server)
	.guard(AuthenticatedGuard)
	.guard(FileAccessGuard)
	.use(FileCallLoggerMiddleware)
	.provide((facts) => fileSystemPartsOn(facts));
