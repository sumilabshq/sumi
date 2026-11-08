import { AuthenticatedGuard, Anywhere, module } from "@widgetarium/data-framework";
import { questions } from "@widgetarium/questions/contract";

export const ask = module("ask")
	.on(Anywhere)
	.imports(questions)
	.guard(AuthenticatedGuard)
	.provide(() => ({}));
