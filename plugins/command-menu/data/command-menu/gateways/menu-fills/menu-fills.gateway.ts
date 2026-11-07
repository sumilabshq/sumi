import type { FilledDoor, FilledPage, FilledRowSource } from "../../shared/host/command-menu.host.js";

export abstract class MenuFillsGateway {
	abstract doors(): readonly FilledDoor[];
	abstract pages(): readonly FilledPage[];
	abstract sources(): readonly FilledRowSource[];
}
