import type { CanvasHosts as CanvasConfig } from "@widgetarium/canvas/implementation";

export type VaultCanvasHosts = Omit<Extract<CanvasConfig, { readonly kind: "vault" }>, "kind">;

export type ProjectCanvasHosts = Omit<Extract<CanvasConfig, { readonly kind: "project" }>, "kind">;

export type CanvasHosts = VaultCanvasHosts | ProjectCanvasHosts;
