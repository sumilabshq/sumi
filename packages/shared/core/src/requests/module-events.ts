import { issuesOf } from "./answer";
import type { Answer } from "./answer";
import type { AnyEvent } from "./event";
import { invalidateInto } from "./invalidation";
import type { Invalidation } from "./invalidation";
import { emitOf } from "./event-bus";
import type { EventBus } from "./event-bus";
import type { Sending } from "./mediator";
import type { ModuleDefinition, Provided } from "./module";
import type { Platform } from "./platform-module";
import { Refused } from "./refused";
import type { FailureReport } from "./report-failure";
import type { AnyRequest } from "./request";
import type { AnySubscriber } from "./subscriber";

export interface StartedModule {
	readonly definition: ModuleDefinition;
	readonly provided: Provided;
}

export interface EventSender {
	send(request: AnyRequest, sent: unknown, sending?: Sending): Promise<Answer<unknown>>;
}

interface EventParts {
	readonly modules: readonly StartedModule[];
	readonly listened: ReadonlySet<string>;
	readonly platform: Platform | null;
	readonly bus: EventBus;
	readonly sender: EventSender;
	readonly reportFailure: FailureReport;
	readonly applyInvalidations: (invalidated: readonly Invalidation[]) => void;
}

const UNDECLARED_SEND = "the subscriber of {event} sends {sent}, which it does not declare in .sends()";
const SENT_FAILED = "{sent} answered {code}: {reason}";
const DROPPED = "{source} gave {event} a payload it does not accept, so it was dropped: {issues}";

export function startModuleEvents(parts: EventParts): () => void {
	const stops = parts.modules.flatMap((started) => [
		...started.definition.listedSubscribers.map((listed) => subscribed(parts, started, listed)),
		...started.definition.ownedEvents
			.filter(({ name }) => parts.listened.has(name))
			.flatMap((emitted) => sourceStarted(parts, started, emitted)),
	]);
	return () => {
		for (const stop of stops) {
			stop();
		}
	};
}

export function listenedEventNames(modules: readonly StartedModule[]): Set<string> {
	return new Set(modules.flatMap(({ definition }) => definition.listedSubscribers.map(({ event }) => event.name)));
}

function subscribed(
	{ bus, sender, applyInvalidations }: EventParts,
	{ definition, provided }: StartedModule,
	listed: AnySubscriber,
): () => void {
	const emitting = {
		declared: listed.emits,
		owner: `the subscriber of ${listed.event.name}`,
		module: definition.name,
	};
	const emit = emitOf(bus, emitting, (event, input) => bus.publish(event, input));
	const send = subscriberSendOf(sender, listed, definition.name);
	const invalidating = {
		module: definition.name,
		importedModuleNames: definition.importedModuleNames,
		owner: emitting.owner,
	};
	return bus.subscribe(listed.event.name, async (input) => {
		const invalidated: Invalidation[] = [];
		await listed.handle(input, {
			...provided,
			send,
			emit,
			invalidate: invalidateInto(invalidated, invalidating),
		});
		applyInvalidations(invalidated);
	});
}

function sourceStarted(
	{ bus, platform, reportFailure }: EventParts,
	{ provided }: StartedModule,
	emitted: AnyEvent,
): (() => void)[] {
	const source = emitted.sourceOn(platform);

	if (source === null) {
		return [];
	}

	const fire = (payload?: unknown): void => {
		const input = emitted.inputSchema.safeParse(payload);

		if (input.success) {
			bus.publish(emitted, input.data);
			return;
		}

		const reason = DROPPED.replace("{source}", source.label)
			.replace("{event}", emitted.name)
			.replace("{issues}", issuesOf(emitted.name, "input", input.error));
		reportFailure({ source: emitted.name, reason, code: "invalid-input", ran: false, thrown: null });
	};
	return [source.listen({ provided }, fire)];
}

function subscriberSendOf(sender: EventSender, listed: AnySubscriber, fromModule: string) {
	return async (sent: AnyRequest, input?: unknown): Promise<unknown> => {
		if (!listed.sends.some(({ name }) => name === sent.name)) {
			throw new Error(UNDECLARED_SEND.replace("{event}", listed.event.name).replace("{sent}", sent.name));
		}

		const answer = await sender.send(sent, input, { fromModule });

		if (answer.ok) {
			return answer.output;
		}

		const reason = SENT_FAILED.replace("{sent}", sent.name)
			.replace("{code}", answer.code)
			.replace("{reason}", answer.reason);
		throw answer.ran ? new Error(reason) : new Refused(reason);
	};
}
