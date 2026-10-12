import type { HostProps } from "./gpu-context.js";

export function textProp(props: HostProps, name: string): string | undefined {
	const held = props[name];
	if (typeof held === "string") return held;
	if (typeof held === "number") return String(held);
	return undefined;
}

export function numberProp(props: HostProps, name: string): number | undefined {
	const held = props[name];
	const read = typeof held === "number" ? held : typeof held === "string" ? Number.parseFloat(held) : Number.NaN;
	return Number.isFinite(read) ? read : undefined;
}

export function hasHandler(props: HostProps, name: string): boolean {
	return typeof props[name] === "function";
}

export function callHandler(props: HostProps, name: string, event: object): void {
	const handler = props[name];
	if (typeof handler === "function") Reflect.apply(handler, undefined, [event]);
}

export function isTextual(children: unknown): boolean {
	return typeof children === "string" || typeof children === "number";
}

export function innerHtmlOf(props: HostProps): string | undefined {
	const inner = props["dangerouslySetInnerHTML"];
	if (typeof inner !== "object" || inner === null || !("__html" in inner)) return undefined;
	return typeof inner.__html === "string" ? inner.__html : undefined;
}
