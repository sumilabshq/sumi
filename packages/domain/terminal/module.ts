import { AuthenticatedGuard, Server, module } from "@widgetarium/data-framework";
import { terminalPartsOn } from "./gateways/terminal-parts/terminal-parts.gateway.js";
import {
	RereadTerminalOutputSubscriber,
	ResizeTerminalCommand,
	SendTerminalCommand,
	TerminalAccessGuard,
	TerminalCallLoggerMiddleware,
	TerminalOutputQuery,
	TypeTerminalCommand,
} from "./features/lines/requests.js";

export const TerminalModule = module("terminal")
	.on(Server)
	.subscribers(RereadTerminalOutputSubscriber)
	.public(TerminalOutputQuery, ResizeTerminalCommand, TypeTerminalCommand, SendTerminalCommand)
	.guard(AuthenticatedGuard)
	.guard(TerminalAccessGuard)
	.use(TerminalCallLoggerMiddleware)
	.provide((facts) => terminalPartsOn(facts));
