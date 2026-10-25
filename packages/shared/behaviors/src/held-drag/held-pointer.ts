export function capturePointer(holder: HTMLElement, pointerId: number, dragName: string): void {
	try {
		holder.setPointerCapture(pointerId);
	} catch (failure: unknown) {
		console.warn(
			`[widgetarium] ${dragName} pointer capture → none (a release outside the window may be lost)`,
			failure,
		);
	}
}

export function releasePointer(holder: HTMLElement, pointerId: number): void {
	if (holder.hasPointerCapture(pointerId)) {
		holder.releasePointerCapture(pointerId);
	}
}

export function swallowNextClick(holder: HTMLElement): void {
	const swallow = (event: MouseEvent): void => {
		event.stopPropagation();
		event.preventDefault();
	};
	holder.addEventListener("click", swallow, { capture: true, once: true });
	setTimeout(() => holder.removeEventListener("click", swallow, { capture: true }), 0);
}

export function muteTextSelection(): () => void {
	const root = document.documentElement.style;
	const was = root.getPropertyValue("user-select");
	window.getSelection()?.removeAllRanges();
	root.setProperty("user-select", "none");
	root.setProperty("-webkit-user-select", "none");
	return () => {
		root.setProperty("user-select", was);
		root.setProperty("-webkit-user-select", was);
	};
}

export function isOutsideWindow(x: number, y: number): boolean {
	return x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight;
}
