import { Device, module } from "@widgetarium/data-framework";
import { tabGroups } from "@sumi/tab-groups/contract";
import { groupsPartsOn } from "./gateways/groups-parts/groups-parts.gateway.js";

export const groups = module("groups")
	.on(Device)
	.imports(tabGroups)
	.provide((facts) => groupsPartsOn(facts));
