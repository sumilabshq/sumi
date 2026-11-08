import type { Region } from "@widgetarium/canvas/contract";

export type RegionOf<K extends Region["kind"]> = Extract<Region, { readonly kind: K }>;
