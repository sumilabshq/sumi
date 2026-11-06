import { issuesOf, reasonOf } from "./answer";
import type { AnyEvent } from "./event";
import type { FailureReport } from "./report-failure";

export type EventListener = (input: unknown) => void | Promise<void>;

const LISTENER_FAILED = "a subscriber of {event} failed: {reason}";

export class EventBus {
	private readonly listeners = new Map<string, Set<EventListener>>();

	constructor(private readonly reportFailure: FailureReport) {}

	subscribe(eventName: string, listener: EventListener): () => void {
		const held = this.listeners.get(eventName) ?? new Set<EventListener>();
		held.add(listener);
		this.listeners.set(eventName, held);
		return () => void held.delete(listener);
	}

	inputOf(event: AnyEvent, sent: unknown): unknown {
		const input = event.inputSchema.safeParse(sent);

		if (!input.success) {
			throw new Error(issuesOf(event.name, "input", input.error));
		}

		return input.data;
	}

	publish(event: AnyEvent, input: unknown): void {
		const heard = [...(this.listeners.get(event.name) ?? [])];

		for (const listener of heard) {
			setTimeout(() => this.deliver(event, listener, input), 0);
		}
	}

	private deliver(event: AnyEvent, listener: EventListener, input: unknown): void {
		try {
			const heard = listener(input);

			if (heard instanceof Promise) {
				heard.catch((thrown: unknown) => this.reportListener(event, thrown));
			}
		} catch (thrown) {
			this.reportListener(event, thrown);
		}
	}

	private reportListener(event: AnyEvent, thrown: unknown): void {
		const reason = LISTENER_FAILED.replace("{event}", event.name).replace("{reason}", reasonOf(thrown));
		this.reportFailure({ source: event.name, reason, code: "failed", ran: false, thrown });
	}
}

export type Deliver = (event: AnyEvent, input: unknown) => void;

const UNDECLARED_EMIT = "{owner} emits {event}, which it does not declare in .emits()";

export interface Emitting {
	readonly declared: readonly AnyEvent[];
	readonly owner: string;
	readonly module: string;
}

export function emitOf(bus: EventBus, { declared, owner, module }: Emitting, deliver: Deliver) {
	return (event: AnyEvent, sent?: unknown): void => {
		const stamped = event.inModule(module);

		if (!declared.some(({ name }) => name === stamped.name)) {
			throw new Error(UNDECLARED_EMIT.replace("{owner}", owner).replace("{event}", stamped.name));
		}

		deliver(stamped, bus.inputOf(stamped, sent));
	};
}
