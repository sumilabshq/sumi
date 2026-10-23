export const WATCHED_BLOCKS = ["ChatRow", "ChatList", "ChatSection", "StripButton", "WorkspaceHeader", "ChatCrumb"];

export const INSTRUMENT = `(() => {
	const watched = new Set(${JSON.stringify(WATCHED_BLOCKS)});
	const PERFORMED_WORK = 1;
	window.__renders = {};
	let seenBefore = new WeakSet();
	const nameOf = (fiber) => (fiber.type?.displayName ?? fiber.type?.name ?? fiber.elementType?.type?.name ?? "").replace(/\\d+$/, "") || null;
	const walk = (fiber, seen) => {
		for (let at = fiber; at !== null; at = at.sibling) {
			seen.add(at);
			const name = nameOf(at);
			const isWorked = !seenBefore.has(at) && (at.flags & PERFORMED_WORK) === PERFORMED_WORK;
			if (name !== null && watched.has(name) && isWorked) {
				window.__renders[name] = (window.__renders[name] ?? 0) + 1;
			}
			if (at.child !== null) walk(at.child, seen);
		}
	};
	window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
		supportsFiber: true,
		isDisabled: false,
		renderers: new Map(),
		inject(renderer) { this.renderers.set(1, renderer); return 1; },
		onCommitFiberRoot(_id, root) {
			const seen = new WeakSet();
			walk(root.current, seen);
			seenBefore = seen;
		},
		onCommitFiberUnmount() {},
		onPostCommitFiberRoot() {},
		onScheduleFiberRoot() {},
		checkDCE() {},
	};
	window.__paintWhen = (eventType, isShown) => new Promise((done) => {
		addEventListener(eventType, (event) => {
			const pressedAt = event.timeStamp;
			let frames = 0;
			const tick = () => {
				frames += 1;
				if (!isShown() && frames < 120) {
					requestAnimationFrame(tick);
					return;
				}
				const painted = new MessageChannel();
				painted.port1.onmessage = () => done({ ms: Math.round(performance.now() - pressedAt), frames, isShown: isShown() });
				painted.port2.postMessage(0);
			};
			requestAnimationFrame(tick);
		}, { capture: true, once: true });
	});
})();`;
