import { isObject } from "@widgetarium/core/engine/is-object.js";

type Method = (...args: unknown[]) => unknown;

export interface RemoteFrame {
	readonly url: string;
	run(code: string): Promise<unknown>;
}

export interface RemoteContents {
	runIsolated(code: string): Promise<unknown>;
	frames(): readonly RemoteFrame[];
}

const ISOLATED_WORLD = 1999;
const NO_REMOTE = "Electron's remote module is not reachable, so the browser cannot read pages";
const NOT_HARDENED = "the browser's session cannot be locked down, so the browser stays off";

export class ElectronRemote {
	constructor(private readonly remote: unknown) {}

	contentsOf(webContentsId: number): RemoteContents {
		const fromId = methodOf(Reflect.get(this.held(), "webContents"), "fromId");
		const contents = fromId?.(webContentsId);
		const runIsolated = methodOf(contents, "executeJavaScriptInIsolatedWorld");

		if (!isObject(contents) || !runIsolated) {
			throw new Error(NO_REMOTE);
		}

		return {
			runIsolated: (code) => Promise.resolve(runIsolated(ISOLATED_WORLD, [{ code }])),
			frames: () => framesOf(contents),
		};
	}

	hardenPartition(partition: string): void {
		const session = methodOf(Reflect.get(this.held(), "session"), "fromPartition")?.(partition);
		const onPermissionAsked = methodOf(session, "setPermissionRequestHandler");
		const onPermissionChecked = methodOf(session, "setPermissionCheckHandler");
		const on = methodOf(session, "on");

		if (!onPermissionAsked || !onPermissionChecked || !on) {
			throw new Error(NOT_HARDENED);
		}

		onPermissionAsked(refusePermission);
		onPermissionChecked(() => false);
		// TRADE-OFF: cancelling in will-download is best effort; a blocked download is not guaranteed
		on("will-download", cancelDownload);
	}

	private held(): object {
		if (!isObject(this.remote)) {
			throw new Error(NO_REMOTE);
		}

		return this.remote;
	}
}

function framesOf(contents: object): readonly RemoteFrame[] {
	const listed: unknown = Reflect.get(Reflect.get(contents, "mainFrame") ?? {}, "framesInSubtree");

	if (!Array.isArray(listed)) {
		throw new Error(NO_REMOTE);
	}

	return listed.map((frame: unknown) => {
		const run = methodOf(frame, "executeJavaScript");

		return {
			url: String(isObject(frame) ? frame["url"] : ""),
			run: (code) => (run ? Promise.resolve(run(code)) : Promise.reject(new Error(NO_REMOTE))),
		};
	});
}

function methodOf(target: unknown, name: string): Method | null {
	if (!isObject(target)) {
		return null;
	}

	const held: unknown = Reflect.get(target, name);

	return typeof held === "function" ? (...args) => Reflect.apply(held, target, args) : null;
}

function refusePermission(_contents: unknown, _permission: unknown, callback: unknown): void {
	if (typeof callback === "function") {
		Reflect.apply(callback, undefined, [false]);
	}
}

function cancelDownload(_event: unknown, item: unknown): void {
	methodOf(item, "cancel")?.();
}
