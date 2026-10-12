import type { HostProps } from "../engine/gpu-context.js";
import { callHandler, hasHandler } from "./node-props.js";

export interface EventNode {
	readonly props: HostProps;
	readonly parent: EventNode | null;
}

export interface GpuEvent {
	readonly type: string;
	readonly clientX: number;
	readonly clientY: number;
	readonly button: number;
	readonly target: null;
	readonly currentTarget: null;
	readonly nativeEvent: { readonly type: string };
	readonly defaultPrevented: boolean;
	preventDefault(): void;
	stopPropagation(): void;
	isPropagationStopped(): boolean;
	isDefaultPrevented(): boolean;
	persist(): void;
}

export const DOWN_HANDLERS = ["onPointerDown", "onMouseDown"] as const;
export const UP_HANDLERS = ["onPointerUp", "onMouseUp"] as const;
export const PRESS_HANDLERS = ["onPress", "onClick"] as const;
export const ENTER_HANDLERS = ["onPointerEnter", "onMouseEnter"] as const;
export const LEAVE_HANDLERS = ["onPointerLeave", "onMouseLeave"] as const;

const PRESSABLE_HANDLERS: readonly string[] = [...PRESS_HANDLERS, ...DOWN_HANDLERS, ...UP_HANDLERS];

export function isPressable(props: HostProps): boolean {
	return PRESSABLE_HANDLERS.some((name) => hasHandler(props, name));
}

export function bubble(from: EventNode | null, names: readonly string[], at: readonly [number, number]): void {
	const event = gpuEventOf(names[0] ?? "", at);
	for (let node = from; node && !event.isPropagationStopped(); node = node.parent)
		for (const name of names) callHandler(node.props, name, event);
}

export function tellEach(nodes: readonly EventNode[], names: readonly string[], at: readonly [number, number]): void {
	for (const node of nodes) for (const name of names) callHandler(node.props, name, gpuEventOf(name, at));
}

function gpuEventOf(name: string, [clientX, clientY]: readonly [number, number]): GpuEvent {
	const type = name.replace(/^on/, "").toLowerCase();
	const flags = { stopped: false, prevented: false };
	return {
		type,
		clientX,
		clientY,
		button: 0,
		target: null,
		currentTarget: null,
		nativeEvent: { type },
		get defaultPrevented() {
			return flags.prevented;
		},
		preventDefault: () => void (flags.prevented = true),
		stopPropagation: () => void (flags.stopped = true),
		isPropagationStopped: () => flags.stopped,
		isDefaultPrevented: () => flags.prevented,
		persist: () => undefined,
	};
}
