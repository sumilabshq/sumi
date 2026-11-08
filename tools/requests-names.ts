import { named } from "../packages/shared/data-framework/src/index.ts";
import type { NamedItem } from "../packages/shared/data-framework/src/index.ts";

export function fullyNamed<T extends NamedItem>(fullName: string, item: T): T {
	const [module = "", ...path] = fullName.split(".");
	named(path.join("."), item);
	const { identity } = "request" in item ? item.request : item;
	identity.module = module;
	return item;
}
