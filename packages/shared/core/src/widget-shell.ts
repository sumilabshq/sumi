import type { ReactNode } from "react";
import { isObject } from "./engine/is-object.js";
import { isDeclaredProps, manifestOfModule } from "./gateway/declared";
import type { DeclaredModule } from "./gateway/declared";
import type { GivenProps } from "./declared-widget.js";

export interface WidgetComponent {
	(given: GivenProps): ReactNode;
	readonly declared?: unknown;
	manifest?: unknown;
}

export type WidgetStates = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

export function componentIn(shell: unknown, at: string): WidgetComponent {
	const exported = defaultIn(shell) ?? shell;
	if (!isWidgetComponent(exported)) throw new Error(`${at}: the file must "export default createWidget(...)"`);
	if (exported.declared) exported.manifest = isDeclaredModule(shell) ? manifestOfModule(shell) : null;
	return exported;
}

export function blocksIn(shell: unknown): Readonly<Record<string, WidgetComponent>> {
	const held: unknown = isObject(shell) ? Reflect.get(shell, "blocks") : undefined;
	if (!isObject(held)) return {};
	return Object.fromEntries(
		Object.entries(held).filter((entry): entry is [string, WidgetComponent] => isWidgetComponent(entry[1])),
	);
}

export function statesIn(shell: unknown): WidgetStates {
	const held = statesHeldIn(shell) ?? statesHeldIn(defaultIn(shell));
	if (!held) return {};
	return Object.fromEntries(
		Object.entries(held).filter((entry): entry is [string, Readonly<Record<string, unknown>>] => isObject(entry[1])),
	);
}

function isWidgetComponent(held: unknown): held is WidgetComponent {
	return typeof held === "function";
}

function isDeclaredModule(shell: unknown): shell is DeclaredModule {
	const exported = defaultIn(shell);
	return isObject(shell) && typeof exported === "function" && isDeclaredProps(Reflect.get(exported, "declared"));
}

function statesHeldIn(shell: unknown): Readonly<Record<string, unknown>> | null {
	const held: unknown = isObject(shell) || typeof shell === "function" ? Reflect.get(shell, "states") : undefined;
	return isObject(held) ? held : null;
}

function defaultIn(shell: unknown): unknown {
	if (!isObject(shell) && typeof shell !== "function") return undefined;
	return Reflect.get(shell, "default");
}
