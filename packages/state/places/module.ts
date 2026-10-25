import { PublicGuard, Server, module } from "@widgetarium/core/requests";
import { placesPartsOn } from "./gateways/places-parts/places-parts.gateway.js";
import {
	CloseWindowCommand,
	KeepLiveWindowsCommand,
	OpenWindowCommand,
	OpenWindowsQuery,
	RereadWindowsSubscriber,
} from "./features/windows/requests.js";

export const PlacesModule = module("places")
	.on(Server)
	.guard(PublicGuard)
	.subscribers(RereadWindowsSubscriber)
	.public(OpenWindowsQuery, OpenWindowCommand, CloseWindowCommand, KeepLiveWindowsCommand)
	.provide((facts) => placesPartsOn(facts));
