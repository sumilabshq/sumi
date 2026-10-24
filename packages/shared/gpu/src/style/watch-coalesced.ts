export interface CoalescedWatch {
	readonly target: Node;
	readonly options: MutationObserverInit;
	readonly reaches: (record: MutationRecord) => boolean;
}

export function watchCoalesced(watch: CoalescedWatch, changed: () => void): () => void {
	const frame = coalescedFrame(() => {
		changed();
		observer.takeRecords();
	});
	const observer = new MutationObserver((records) => {
		if (records.some(watch.reaches)) {
			frame.request();
		}
	});
	observer.observe(watch.target, watch.options);
	return () => {
		observer.disconnect();
		frame.cancel();
	};
}

export function isInside(node: Node, selector: string): boolean {
	const element = node instanceof Element ? node : node.parentElement;
	return element?.closest(selector) != null;
}

function coalescedFrame(run: () => void): { readonly request: () => void; readonly cancel: () => void } {
	let pending = 0;
	const ran = (): void => {
		pending = 0;
		run();
	};
	return {
		request: () => {
			pending = pending === 0 ? requestAnimationFrame(ran) : pending;
		},
		cancel: () => cancelAnimationFrame(pending),
	};
}
