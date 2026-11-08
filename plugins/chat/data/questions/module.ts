import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { questionsPartsOn } from "./gateways/questions-parts/questions-parts.gateway.js";

export const questions = module("questions")
	.on(Server)
	.guard(PublicGuard)
	.provide((facts) => questionsPartsOn(facts));
