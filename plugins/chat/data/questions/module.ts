import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { questionsPartsOn } from "./gateways/questions-parts/questions-parts.gateway.js";
import { handled } from "./generated/handled.js";

export const questions = module()
	.on(Server)
	.guard(PublicGuard)
	.provide((facts) => questionsPartsOn(facts))
	.handles(handled);
