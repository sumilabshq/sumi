import { useMemo } from "react";
import type { CollectionGateway } from "@widgetarium/data-framework/gateway/contract";
import { stableKey } from "@widgetarium/data-framework/gateway/stable-key";
import type { Narrowing } from "./narrow";
import { narrow } from "./narrow";

export function useNarrowed<T>(base: CollectionGateway<T>, where: Narrowing, by?: string): CollectionGateway<T> {
	const key = stableKey(where);
	return useMemo(() => narrow(base, where, by), [base.id, key, by]);
}
