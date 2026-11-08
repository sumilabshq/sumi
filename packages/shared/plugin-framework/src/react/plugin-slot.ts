import { Fragment, createContext, createElement, useContext } from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { NO_SLOT_FILLS } from "../slot-fills";
import type { SlotFills } from "../slot-fills";

export interface PluginSlotProps {
	readonly name: string;
	readonly props?: Readonly<Record<string, unknown>>;
	readonly children?: ReactNode;
}

type SlotDrawing = ComponentType<Readonly<Record<string, unknown>>>;

export const PluginSlotsContext = createContext<SlotFills>(NO_SLOT_FILLS);

export function PluginSlot({ name, props = {}, children = null }: PluginSlotProps): ReactElement {
	const { replacement } = useContext(PluginSlotsContext).fillOf(name);
	return isDrawing(replacement) ? createElement(replacement, props) : createElement(Fragment, null, children);
}

export function ListPluginSlot({ name, props = {}, children = null }: PluginSlotProps): ReactElement {
	const { added } = useContext(PluginSlotsContext).fillOf(name);

	if (added.length === 0) {
		return createElement(Fragment, null, children);
	}

	return createElement(
		Fragment,
		null,
		added.flatMap((drawing, index) => (isDrawing(drawing) ? [createElement(drawing, { ...props, key: index })] : [])),
	);
}

function isDrawing(component: unknown): component is SlotDrawing {
	return typeof component === "function";
}
