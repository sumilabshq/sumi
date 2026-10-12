import type { HostConfig, ReactContext } from "react-reconciler";
import { DefaultEventPriority, NoEventPriority } from "react-reconciler/constants.js";
import { FrameRoot } from "../frames/frame-root.js";
import type { HostProps, HostType } from "../engine/gpu-context.js";
import { isTextual } from "../nodes/node-props.js";
import { textOfChildren } from "../nodes/node-text.js";
import { SceneNode } from "../nodes/scene-node.js";

type GpuHostConfig = HostConfig<
	HostType,
	HostProps,
	FrameRoot,
	SceneNode,
	SceneNode,
	never,
	never,
	never,
	never,
	null,
	FrameRoot | null,
	never,
	ReturnType<typeof setTimeout>,
	-1,
	null,
	null,
	null,
	never,
	never,
	never
>;

const NO_TRANSITION: ReactContext<null> = {
	$$typeof: Symbol.for("react.context"),
	get Consumer(): ReactContext<null> {
		return NO_TRANSITION;
	},
	get Provider() {
		return { $$typeof: Symbol.for("react.provider"), _context: NO_TRANSITION };
	},
	_currentValue: null,
	_currentValue2: null,
	_threadCount: 0,
};

const updatePriority = { current: NoEventPriority };
const committing: { frame: FrameRoot | null } = { frame: null };
const rendering: { frame: FrameRoot | null } = { frame: null };

export function withUpdatePriority(priority: number, run: () => void): void {
	const previous = updatePriority.current;
	updatePriority.current = priority;
	try {
		run();
	} finally {
		updatePriority.current = previous;
	}
}

export const HOST_CONFIG: GpuHostConfig = {
	supportsMutation: true,
	supportsPersistence: false,
	supportsHydration: false,
	isPrimaryRenderer: false,
	rendererVersion: "0.33.0",
	rendererPackageName: "@widgetarium/studio-gpu",
	extraDevToolsConfig: null,
	bindToConsole: () => noop,
	noTimeout: -1,
	scheduleTimeout: (run, delay) => setTimeout(run, delay),
	cancelTimeout: (handle) => clearTimeout(handle),
	supportsMicrotasks: true,
	scheduleMicrotask: (run) => queueMicrotask(() => void run()),
	createInstance: (type, props, container, frame) => new SceneNode(type, props, ownerOf(container, frame)),
	createTextInstance: (text, container, frame) => new SceneNode("Text", { children: text }, ownerOf(container, frame)),
	appendInitialChild: (parent, child) => parent.insert(child, parent.children.length),
	appendChild: (parent, child) => parent.insert(child, parent.children.length),
	appendChildToContainer: (container, child) =>
		rootIn(container)?.insert(child, rootIn(container)?.children.length ?? 0),
	insertBefore: (parent, child, before) => parent.insertBefore(child, before),
	insertInContainerBefore: (container, child, before) => rootIn(container)?.insertBefore(child, before),
	removeChild: (parent, child) => parent.remove(child),
	removeChildFromContainer: (container, child) => rootIn(container)?.remove(child),
	clearContainer: (frame) => {
		for (const child of [...frame.root.children]) frame.root.remove(child);
	},
	finalizeInitialChildren: () => false,
	commitUpdate: (node, type, previous, next) => {
		if (propsChanged(type, previous, next)) node.setProps(next);
		else node.props = next;
	},
	commitTextUpdate: (node, _old, text) => node.setProps({ ...node.props, children: text }),
	shouldSetTextContent: (type, props) => type === "Text" || type === "textarea" || isTextual(props.children),
	resetTextContent: (node) => node.dropOwnText(),
	getRootHostContext: (container) => {
		if (container instanceof FrameRoot) rendering.frame = container;
		return rendering.frame;
	},
	getChildHostContext: (parent) => parent,
	getPublicInstance: () => null,
	prepareForCommit: (container) => {
		committing.frame = container instanceof FrameRoot ? container : committing.frame;
		return null;
	},
	resetAfterCommit: (container) => {
		committing.frame = null;
		if (container instanceof FrameRoot) container.markLayoutDirty();
	},
	preparePortalMount: noop,
	getInstanceFromNode: () => null,
	beforeActiveInstanceBlur: noop,
	afterActiveInstanceBlur: noop,
	prepareScopeUpdate: noop,
	getInstanceFromScope: () => null,
	detachDeletedInstance: noop,
	hideInstance: noop,
	unhideInstance: noop,
	hideTextInstance: noop,
	unhideTextInstance: noop,
	NotPendingTransition: null,
	HostTransitionContext: NO_TRANSITION,
	setCurrentUpdatePriority: (priority) => (updatePriority.current = priority),
	getCurrentUpdatePriority: () => updatePriority.current,
	resolveUpdatePriority: () =>
		updatePriority.current === NoEventPriority ? DefaultEventPriority : updatePriority.current,
	resetFormInstance: noop,
	requestPostPaintCallback: noop,
	shouldAttemptEagerTransition: () => false,
	trackSchedulerEvent: noop,
	resolveEventType: () => null,
	resolveEventTimeStamp: () => performance.now(),
	maySuspendCommit: () => false,
	maySuspendCommitOnUpdate: () => false,
	maySuspendCommitInSyncRender: () => false,
	preloadInstance: () => true,
	startSuspendingCommit: () => null,
	suspendInstance: noop,
	suspendOnActiveViewTransition: noop,
	waitForCommitToBeReady: () => null,
	getSuspendedCommitReason: () => null,
};

function propsChanged(type: HostType, previous: HostProps, next: HostProps): boolean {
	for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
		const [was, now] = [previous[key], next[key]];
		if (key === "children" && (type === "Text" || isTextual(was) || isTextual(now))) {
			if (textOfChildren(was) !== textOfChildren(now)) return true;
		} else if (key !== "children" && was !== now && (typeof was !== "function" || typeof now !== "function"))
			return true;
	}
	return false;
}

function ownerOf(container: FrameRoot, frame: FrameRoot | null): FrameRoot {
	if (container instanceof FrameRoot) return container;
	if (frame) return frame;
	throw new Error("gpu canvas: a portal opened outside any frame");
}

// TRADE-OFF: a portal's container is a DOM node; its content is drawn at the end of the frame being committed
function rootIn(container: FrameRoot): SceneNode | null {
	return container instanceof FrameRoot ? container.root : (committing.frame?.root ?? null);
}

function noop(): void {}
