import { AuthenticatedGuard, Server, module } from "@widgetarium/data-framework";
import { terminalPartsOn } from "./gateways/terminal-parts/terminal-parts.gateway.js";
import { TerminalAccessGuard, TerminalCallLoggerMiddleware } from "./features/lines/requests.js";
import { handled } from "./generated/handled.js";

export const TerminalModule = module("terminal")
	.on(Server)
	.guard(AuthenticatedGuard)
	.guard(TerminalAccessGuard)
	.use(TerminalCallLoggerMiddleware)
	.provide((facts) => terminalPartsOn(facts))
	.handles(...handled);
