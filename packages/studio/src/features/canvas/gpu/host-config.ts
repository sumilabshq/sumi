import type { HostConfig, ReactContext } from "react-reconciler";
import { DefaultEventPriority, NoEventPriority } from "react-reconciler/constants";
import type { FrameRoot } from "./frame-root.js";
import type { HostProps, HostType } from "./gpu-context.js";
import { textOfChildren } from "./node-text.js";
import { SceneNode } from "./scene-node.js";

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
	SceneNode,
	null,
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
	createInstance: (type, props, frame) => new SceneNode(type, props, frame),
	createTextInstance: (text, frame) => new SceneNode("Text", { children: text }, frame),
	appendInitialChild: (parent, child) => parent.insert(child, parent.children.length),
	appendChild: (parent, child) => parent.insert(child, parent.children.length),
	appendChildToContainer: (frame, child) => frame.root.insert(child, frame.root.children.length),
	insertBefore: (parent, child, before) => parent.insertBefore(child, before),
	insertInContainerBefore: (frame, child, before) => frame.root.insertBefore(child, before),
	removeChild: (parent, child) => parent.remove(child),
	removeChildFromContainer: (frame, child) => frame.root.remove(child),
	clearContainer: (frame) => {
		for (const child of [...frame.root.children]) frame.root.remove(child);
	},
	finalizeInitialChildren: () => false,
	commitUpdate: (node, type, previous, next) => {
		if (propsChanged(type, previous, next)) node.setProps(next);
	},
	commitTextUpdate: (node, _old, text) => node.setProps({ ...node.props, children: text }),
	shouldSetTextContent: (type) => type === "Text",
	resetTextContent: noop,
	getRootHostContext: () => null,
	getChildHostContext: (parent) => parent,
	getPublicInstance: (node) => node,
	prepareForCommit: () => null,
	resetAfterCommit: (frame) => frame.markLayoutDirty(),
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
	const keys = new Set<keyof HostProps>([...keysOf(previous), ...keysOf(next)]);
	for (const key of keys) {
		if (key !== "children" && previous[key] !== next[key]) return true;
		if (key === "children" && type === "Text" && textOfChildren(previous.children) !== textOfChildren(next.children))
			return true;
	}
	return false;
}

function keysOf(props: HostProps): (keyof HostProps)[] {
	const known: readonly (keyof HostProps)[] = ["className", "children", "onPress", "name", "size"];
	return known.filter((key) => key in props);
}

function noop(): void {}
