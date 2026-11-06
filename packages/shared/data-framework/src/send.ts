import type { Answer } from "./answer";
import type { CallingModule } from "./calling-module";
import { Refused } from "./refused";
import type { AnyRequest, InputArgs, OutputOf } from "./request";

export type Send = <R extends AnyRequest>(request: R, ...asked: InputArgs<R>) => Promise<OutputOf<R>>;

export type Sender = Readonly<Record<"send", Send>>;

const SEND_NOT_IMPORTED = '{owner} sends {sent}, but module "{module}" does not import {sentModule}: add .imports()';
const SENT_FAILED = "{sent} answered {code}: {reason}";

export function stampSent(sent: AnyRequest, { module, importedModuleNames, owner }: CallingModule): AnyRequest {
	const stamped = sent.inModule(module);
	const sentModule = stamped.module ?? module;

	if (sentModule === module || importedModuleNames.includes(sentModule)) {
		return stamped;
	}

	throw new Error(
		SEND_NOT_IMPORTED.replace("{owner}", owner)
			.replace("{sent}", stamped.name)
			.replace("{module}", module)
			.replace("{sentModule}", sentModule),
	);
}

export function outputOfSent(sent: AnyRequest, answer: Answer<unknown>): unknown {
	if (answer.ok) {
		return answer.output;
	}

	const reason = SENT_FAILED.replace("{sent}", sent.name)
		.replace("{code}", answer.code)
		.replace("{reason}", answer.reason);
	throw answer.ran ? new Error(reason) : new Refused(reason);
}
