import { DEFAULT_CLAUDE_OPTIONS } from "../../shared/schema/claude-options.schema.js";
import type { ClaudeOptionAsked, ClaudeOptions, PlanUsage } from "../../shared/schema/claude-options.schema.js";
import { ClaudeOptionsGateway } from "./claude-options.gateway.js";

export class ClaudeOptionsHeld {
	private held: ClaudeOptions = DEFAULT_CLAUDE_OPTIONS;
	private readonly watchers = new Set<() => void>();

	now(): ClaudeOptions {
		return this.held;
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	choose(asked: ClaudeOptionAsked): void {
		this.become({ ...this.held, ...asked }, `chose ${JSON.stringify(asked)}`);
	}

	heardUsage(usage: PlanUsage): void {
		this.become({ ...this.held, usage }, "the provider reported its plan usage");
	}

	private become(next: ClaudeOptions, reason: string): void {
		const was = this.held;
		this.held = next;
		console.debug(`[widgetarium] claude options ${JSON.stringify(was)} → ${JSON.stringify(next)} (${reason})`);
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}

export class HeldClaudeOptionsGateway extends ClaudeOptionsGateway {
	constructor(private readonly held: ClaudeOptionsHeld) {
		super();
	}

	options(): ClaudeOptions {
		return this.held.now();
	}

	watch(changed: () => void): () => void {
		return this.held.watch(changed);
	}

	choose(asked: ClaudeOptionAsked): void {
		this.held.choose(asked);
	}
}
