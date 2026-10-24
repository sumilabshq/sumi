import { createElement as h, useContext, useEffect, useRef } from "react";
import type { ComponentType, ContextType, ReactElement, ReactNode, RefObject } from "react";
import { DRAWS_INLINE } from "./draws-inline.js";
import { rootWidget } from "./widget-root.js";
import { PLATES_ABOVE } from "@widgetarium/kit/surface";
import { MountSettingsButton } from "./mount-settings-button.js";
import type { EnterableMount } from "./mount-settings-button.js";
import type { Release } from "./gateway/host.js";

export { DrawnInShell } from "./drawn-in-shell.js";

export type PlatesAbove = ContextType<typeof PLATES_ABOVE>;

const NOT_INLINE = "{name} draws itself into the page, so it cannot be drawn here";

export type DrawWidget<Props> = (element: HTMLElement, component: ComponentType<Props>, props: Props) => Release;

interface DrawableWidget<Props> {
	readonly component: ComponentType<Props>;
	readonly draw?: DrawWidget<Props> | null | undefined;
	readonly manifest?: { readonly id?: string | undefined } | null | undefined;
}

interface MountedEntry {
	readonly name?: string | undefined;
	readonly title?: string | null | undefined;
	readonly drawInto?: ((element: HTMLElement, platesAbove: PlatesAbove) => Release) | null | undefined;
	readonly drawInline?: (() => ReactNode) | null | undefined;
	readonly enter?: (() => void) | null | undefined;
}

export interface MountedProps {
	readonly entry: MountedEntry;
}

export function drawWidget<Props extends object>(definition: DrawableWidget<Props>, props: Props): ReactElement {
	const draw = definition.draw;
	if (!draw) return rootWidget(h(definition.component, props));
	const entry = {
		name: definition.manifest?.id,
		drawInto: (element: HTMLElement) => draw(element, definition.component, props),
	};
	return h(Mounted, { entry });
}

export function Mounted({ entry }: MountedProps): ReactElement {
	const isInline = useContext(DRAWS_INLINE);
	const node = useDrawsInto(isInline ? {} : entry);
	if (isInline) return drawnInline(entry);
	if (!entry.drawInto) return nothingToDraw(entry);
	const drawn = h("div", { className: "wg-mounted", ref: node, key: "drawn" });
	if (!isEnterable(entry)) return drawn;
	return h("div", { className: "wg-mounted-holder" }, [drawn, h(MountSettingsButton, { entry, key: "press" })]);
}

function useDrawsInto(entry: MountedEntry): RefObject<HTMLDivElement | null> {
	const node = useRef<HTMLDivElement>(null);
	const release = useRef<Release | null>(null);
	const platesAbove = useContext(PLATES_ABOVE);

	useEffect(() => {
		if (entry.drawInto) {
			if (node.current) release.current = entry.drawInto(node.current, platesAbove);
			return;
		}
		release.current?.();
		release.current = null;
	}, [entry.drawInto, platesAbove]);
	useEffect(() => () => release.current?.(), []);
	return node;
}

function drawnInline(entry: MountedEntry): ReactElement {
	if (entry.drawInline) return h("div", { className: "wg-mounted" }, entry.drawInline());
	const said = NOT_INLINE.replace("{name}", entry.name ?? "This view");
	return h("div", { className: "wg-missing", "data-not-inline": entry.name ?? "" }, h("b", null, said));
}

function nothingToDraw(entry: MountedEntry): ReactElement {
	console.error(
		`Widgetarium: Mounted was given "${entry.name}", which has nothing to draw — branch on entry.problem first`,
	);
	return h("div", { className: "wg-missing" }, h("b", null, "This view cannot be drawn"));
}

function isEnterable(entry: MountedEntry): entry is MountedEntry & EnterableMount {
	return Boolean(entry.enter);
}
