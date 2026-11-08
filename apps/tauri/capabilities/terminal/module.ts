import { AuthenticatedGuard, Server, module } from "@widgetarium/data-framework";
import { terminalPartsOn } from "./gateways/terminal-parts/terminal-parts.gateway.js";
import { TerminalAccessGuard, TerminalCallLoggerMiddleware } from "./features/lines/requests.js";

export const terminal = module("terminal")
	.on(Server)
	.guard(AuthenticatedGuard)
	.guard(TerminalAccessGuard)
	.use(TerminalCallLoggerMiddleware)
	.provide((facts) => terminalPartsOn(facts));
