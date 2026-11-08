import { sentenceOf } from "./sentence";

const SLOT_NAME = /^[a-z]+(-[a-z]+)*\.[a-z]+(-[a-z]+)*$/;
const BAD_SLOT_NAME =
	'"{name}" is not a slot name: the owner plugin\'s id and the slot, each kebab-case, joined by a dot, such as "chat.composer-model"';

export type SlotComponent<Props> = (props: Props) => unknown;

export type SlotShape = "single" | "list";

export interface SlotReplacing<Props> {
	replace(component: SlotComponent<Props>): void;
}

export interface SlotAdding<Props> {
	add(component: SlotComponent<Props>): void;
}

export type SlotFilling<Props, Shape extends SlotShape> = Shape extends "list"
	? SlotAdding<Props>
	: SlotReplacing<Props>;

export class UiSlot<out Props, out Shape extends SlotShape> {
	declare readonly props: Props;

	constructor(
		readonly name: string,
		readonly shape: Shape,
	) {}
}

export function pluginSlot<Props>(name: string): UiSlot<Props, "single"> {
	return new UiSlot<Props, "single">(checkedSlotName(name), "single");
}

export function listPluginSlot<Props>(name: string): UiSlot<Props, "list"> {
	return new UiSlot<Props, "list">(checkedSlotName(name), "list");
}

function checkedSlotName(name: string): string {
	if (!SLOT_NAME.test(name)) {
		throw new Error(sentenceOf(BAD_SLOT_NAME, { name }));
	}

	return name;
}
