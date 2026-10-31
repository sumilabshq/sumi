import { AuthenticatedGuard, Server, module } from "@widgetarium/core/requests";
import { terminalPartsOn } from "./gateways/terminal-parts/terminal-parts.gateway.js";
import {
	RereadTerminalOutputSubscriber,
	SendTerminalCommand,
	TerminalAccessGuard,
	TerminalCallLoggerMiddleware,
	TerminalOutputQuery,
} from "./features/lines/requests.js";

export const TerminalModule = module("terminal")
	.on(Server)
	.subscribers(RereadTerminalOutputSubscriber)
	.public(TerminalOutputQuery, SendTerminalCommand)
	.guard(AuthenticatedGuard)
	.guard(TerminalAccessGuard)
	.use(TerminalCallLoggerMiddleware)
	.provide((facts) => terminalPartsOn(facts));
