export type WindowEventName =
	"pointerdown" | "pointermove" | "pointerup" | "pointercancel" | "keydown" | "keyup" | "click";

export interface WindowListening {
	readonly of: Element;
	readonly capture?: boolean;
}

export function listenToWindow<K extends WindowEventName>(
	type: K,
	listener: (event: WindowEventMap[K]) => void,
	{ of, capture = false }: WindowListening,
): () => void {
	const view = of.ownerDocument.defaultView;
	if (!view) {
		return () => undefined;
	}

	view.addEventListener(type, listener, capture);
	return () => view.removeEventListener(type, listener, capture);
}
