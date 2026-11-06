import { isValidElement, useRef } from "react";
import type { ReactElement } from "react";
import { useSlotsOf } from "./slot-components.js";
import type { SlotComponent, SlotList } from "./slot-components.js";
import type { MountEntry } from "./gateway/host.js";
import { isObject } from "@widgetarium/framework/is-object";

export function useSlotsGiven(held: unknown, isSingle: boolean): SlotComponent | SlotList {
	const nodes = elementsOf(held);
	const fromEntries = useSlotsOf(entriesOf(held), isSingle);
	const fromNodes = useSlotsOfElements(nodes, isSingle);
	return nodes.length > 0 ? fromNodes : fromEntries;
}

function useSlotsOfElements(elements: readonly ReactElement[], isSingle: boolean): SlotComponent | SlotList {
	const made = useRef(new Map<string, SlotComponent>());
	const latest = useRef(new Map<string, ReactElement>());
	const ids = elements.map((element, index) => element.key ?? String(index));
	elements.forEach((element, index) => latest.current.set(ids[index] ?? String(index), element));
	const components = ids.map((id) => componentDrawing(id, made.current, latest.current));
	if (isSingle) return components[0] ?? EMPTY_SLOT;
	return Object.assign(components, { entries: [] });
}

const EMPTY_SLOT: SlotComponent = Object.assign((): null => null, { id: "", entry: null });

function componentDrawing(
	id: string,
	made: Map<string, SlotComponent>,
	latest: ReadonlyMap<string, ReactElement>,
): SlotComponent {
	const known = made.get(id);
	if (known) return known;
	const component: SlotComponent = Object.assign((): ReactElement | null => latest.get(id) ?? null, {
		id,
		entry: null,
	});
	made.set(id, component);
	return component;
}

function elementsOf(held: unknown): readonly ReactElement[] {
	if (isValidElement(held)) return [held];
	return Array.isArray(held) ? held.filter((one): one is ReactElement => isValidElement(one)) : [];
}

function entriesOf(held: unknown): readonly MountEntry[] {
	return Array.isArray(held) ? held.filter(isMountEntry) : [];
}

function isMountEntry(held: unknown): held is MountEntry {
	return isObject(held) && typeof held["name"] === "string";
}
