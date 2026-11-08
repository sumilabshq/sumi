import { checkedModuleName, nameIdentity, placeIdentity } from "./identity";
import type { Identified, Identity } from "./identity";
import type { ModuleItem } from "./module";
import type { AnySubscriber } from "./subscriber";

export type NamedItem = Identified | { readonly request: Identified };

export interface HandledItems {
	readonly module: string;
	readonly items: readonly ModuleItem[];
}

const ITEM = "a request or an event";

export function named<T extends NamedItem>(path: string, item: T): T {
	nameIdentity(identityOfItem(item), path, ITEM);
	return item;
}

export function handledItems(module: string, items: readonly ModuleItem[]): HandledItems {
	return {
		module: checkedModuleName(module),
		items,
	};
}

export function placeItem(item: ModuleItem | NamedItem, module: string): void {
	if (isSubscriber(item)) {
		return;
	}

	placeIdentity(identityOfItem(item), module, ITEM);
}

function isSubscriber(item: ModuleItem | NamedItem): item is AnySubscriber {
	return "kind" in item && item.kind === "subscriber";
}

function identityOfItem(item: NamedItem): Identity {
	return "request" in item ? item.request.identity : item.identity;
}
