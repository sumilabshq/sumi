import type {
	CommandMenuConfig,
	FilledDoor,
	FilledPage,
	FilledRowSource,
} from "../../shared/host/command-menu.host.js";
import { MenuFillsGateway } from "./menu-fills.gateway.js";

export class ConfiguredMenuFillsGateway extends MenuFillsGateway {
	constructor(private readonly config: CommandMenuConfig) {
		super();
	}

	doors(): readonly FilledDoor[] {
		return this.config.doors;
	}

	pages(): readonly FilledPage[] {
		return this.config.pages;
	}

	sources(): readonly FilledRowSource[] {
		return this.config.sources;
	}
}
