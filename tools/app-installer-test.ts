import { createHash } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { CONTRACT_VERSION } from "@sumi/contract";
import { app } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import {
	AppRegistryQuery,
	FailAppVersionCommand,
	InstallAppCommand,
	InstalledAppsQuery,
	RetryAppVersionCommand,
	SwitchAppVersionCommand,
	UpdateAppsCommand,
} from "../packages/state/app-installer/index.ts";
import { MemoryAppsGateway } from "../packages/state/app-installer/gateways/apps/memory.gateway.ts";
import type { ReleaseRead } from "../packages/state/app-installer/gateways/apps/apps.gateway.ts";
import { InstallsRecorded, heldAppsOf, outputOf } from "./app-installer-fixture.ts";
import { AppInstallerModule } from "../packages/state/app-installer/module.ts";
import { framePolicyServedFrom } from "./frame-policy.ts";
import { fleetChecks } from "./app-frame-fleet-checks.ts";
import { pageFactChecks } from "./app-page-facts-checks.ts";
import { RELEASE_FILE } from "./app-release.ts";
import { paged, waitUntil } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { buildHelloReleases, HELLO_RELEASES, helloReleaseFolderOf } from "./hello-app-build.ts";
import { bundleOf } from "./harness.ts";
import { check, tally } from "./check-helpers.ts";

const GATE = "test:app-installer";
const WAIT_MS = 15_000;
const STEP_MS = 500;
const HELLO_ROOT = await buildHelloReleases();

function releaseReadOf(version: string): ReleaseRead {
	const folder = helloReleaseFolderOf(HELLO_ROOT, version);
	const manifestBytes = readFileSync(path.join(folder, "sumi-app.json"));
	return {
		manifest: JSON.parse(manifestBytes.toString("utf8")),
		release: JSON.parse(readFileSync(path.join(folder, RELEASE_FILE), "utf8")),
		manifestSha256: createHash("sha256").update(manifestBytes).digest("hex"),
	};
}

function withManifest(read: ReleaseRead, change: Record<string, unknown>): ReleaseRead {
	return {
		...read,
		manifest: {
			...(read.manifest as Record<string, unknown>),
			...change,
		},
		release: {
			...read.release,
			app: typeof change["id"] === "string" ? change["id"] : read.release.app,
		},
	};
}

async function moduleChecks(): Promise<void> {
	await malformedRegistryChecks();
	const hello100 = releaseReadOf("1.0.0");
	const apps = new InstallsRecorded(
		heldAppsOf(
			{
				apps: [
					{ id: "hello", source: { kind: "folder", path: "/hello" } },
					{ id: "hello", source: { kind: "folder", path: "/other" } },
					{ id: "elsewhere", source: { kind: "github", repository: "someone/elsewhere" } },
					{ id: "future", source: { kind: "folder", path: "/future" } },
					{ id: "impostor", source: { kind: "folder", path: "/impostor" } },
					{ id: "canvas", source: { kind: "folder", path: "/canvas" } },
					{ id: "tasks", source: { kind: "folder", path: "/tasks" } },
				],
			},
			{
				"/hello": hello100,
				"/future": withManifest(hello100, { id: "future", contract: "^9.0" }),
				"/impostor": hello100,
				"/canvas": withManifest(hello100, { id: "canvas" }),
				"/tasks": withManifest(hello100, { id: "tasks" }),
			},
		),
	);
	const started = app().modules(AppInstallerModule.with({ apps })).start();
	await gateChecks(started);
	await manifestShaChecks(started, apps);
	await versionChecks(started, apps);
	await retryChecks(started);
}

async function manifestShaChecks(started: StartedApp, apps: InstallsRecorded): Promise<void> {
	check(
		"tasks is no longer reserved: it installs from the registry like any app",
		await outputOf(started.send(InstallAppCommand, { id: "tasks" })),
		{ id: "tasks", version: "1.0.0" },
	);
	check(
		"install hands over the manifest hash inspect answered",
		apps.asked.at(-1)?.manifestSha256,
		releaseReadOf("1.0.0").manifestSha256,
	);
	const inspected = await apps.readRelease("/hello");
	apps.placeFolder("/hello", releaseReadOf("1.0.1"));
	const changed = await apps.install({ id: "hello", path: "/hello", manifestSha256: inspected.manifestSha256 }).then(
		() => "installed",
		(refused: unknown) => (refused instanceof Error ? refused.message : String(refused)),
	);
	check("a manifest that changed since inspect is refused", changed, "sumi-app.json changed since it was inspected");
	apps.placeFolder("/hello", releaseReadOf("1.0.0"));
}

async function malformedRegistryChecks(): Promise<void> {
	const malformed = app()
		.modules(AppInstallerModule.with({ apps: new MemoryAppsGateway(heldAppsOf({ apps: [{ id: "x" }] }, {})) }))
		.start();
	const unread = await outputOf(malformed.send(AppRegistryQuery));
	check(
		"a registry that does not parse is named as a problem, never read as empty silently",
		typeof unread === "object" && unread.problem !== null && unread.apps.length === 0,
		true,
	);
}

async function gateChecks(started: StartedApp): Promise<void> {
	const registry = await outputOf(started.send(AppRegistryQuery));
	check(
		"a registry naming an id twice keeps the first row and says so",
		typeof registry === "object" ? [registry.apps.map(({ id }) => id), registry.problem] : registry,
		[
			["hello", "elsewhere", "future", "impostor", "canvas", "tasks"],
			'registry.json lists "hello" more than once; the first row is used',
		],
	);
	check(
		"an id the registry does not list is refused",
		await outputOf(started.send(InstallAppCommand, { id: "nowhere" })),
		'refused: "nowhere" is not in the registry',
	);
	check(
		"a GitHub source is refused until it is built",
		await outputOf(started.send(InstallAppCommand, { id: "elsewhere" })),
		"refused: installing from GitHub is not built yet",
	);
	check(
		"a release built for a newer contract does not pass the gate",
		await outputOf(started.send(InstallAppCommand, { id: "future" })),
		`refused: This app needs contract ^9.0 and Sumi speaks ${CONTRACT_VERSION}: update Sumi`,
	);
	check(
		"a release naming another app than its registry row is refused",
		await outputOf(started.send(InstallAppCommand, { id: "impostor" })),
		'refused: the registry names "impostor" and its release names "hello"',
	);
	check(
		"an app may not take the name of a page Sumi draws itself",
		await outputOf(started.send(InstallAppCommand, { id: "canvas" })),
		'refused: "canvas" is the name of a page Sumi draws itself, so no app may take it',
	);
}

async function versionChecks(started: StartedApp, apps: MemoryAppsGateway): Promise<void> {
	check(
		"installing hello answers the version it laid",
		await outputOf(started.send(InstallAppCommand, { id: "hello" })),
		{ id: "hello", version: "1.0.0" },
	);
	const firstInstalled = await outputOf(started.send(InstalledAppsQuery));
	check(
		"the first install is current, with the manifest's name and the page's address",
		typeof firstInstalled === "object" ? firstInstalled.apps.find(({ id }) => id === "hello") : firstInstalled,
		{
			id: "hello",
			current: "1.0.0",
			previous: null,
			failed: [],
			versions: ["1.0.0"],
			face: { name: "Hello", version: "1.0.0", pageUrl: "sumi-app://hello/1.0.0/index.html" },
			problem: null,
		},
	);
	check("an update with nothing newer switches nothing", await outputOf(started.send(UpdateAppsCommand)), {
		switched: [],
		refusals: [],
	});
	apps.placeFolder("/hello", releaseReadOf("1.0.1"));
	check(
		"an update stages the newer release and switches to it",
		[await outputOf(started.send(UpdateAppsCommand)), (await apps.readInstalled())["hello"]],
		[
			{ switched: [{ id: "hello", version: "1.0.1" }], refusals: [] },
			{ current: "1.0.1", previous: "1.0.0", failed: [], versions: ["1.0.0", "1.0.1"] },
		],
	);
	check(
		"failing the current version brings the previous one back",
		await outputOf(started.send(FailAppVersionCommand, { id: "hello", version: "1.0.1" })),
		{ current: "1.0.0", previous: null, failed: ["1.0.1"], versions: ["1.0.0", "1.0.1"] },
	);
	check(
		"a failed version is never switched to",
		await outputOf(started.send(SwitchAppVersionCommand, { id: "hello", version: "1.0.1" })),
		"refused: 1.0.1 failed before and cannot be made current",
	);
	check("an update skips a version that failed", await outputOf(started.send(UpdateAppsCommand)), {
		switched: [],
		refusals: [],
	});
}

async function retryChecks(started: StartedApp): Promise<void> {
	check(
		"trying a failed version again clears it and keeps the current one",
		await outputOf(started.send(RetryAppVersionCommand, { id: "hello", version: "1.0.1" })),
		{ current: "1.0.0", previous: null, failed: [], versions: ["1.0.0", "1.0.1"] },
	);
	await started.send(FailAppVersionCommand, { id: "hello", version: "1.0.1" });
	check(
		"failing the only good version leaves the app with none",
		await outputOf(started.send(FailAppVersionCommand, { id: "hello", version: "1.0.0" })),
		{ current: null, previous: null, failed: ["1.0.1", "1.0.0"], versions: ["1.0.0", "1.0.1"] },
	);
	check(
		"trying again with no current makes that version current",
		await outputOf(started.send(RetryAppVersionCommand, { id: "hello", version: "1.0.0" })),
		{ current: "1.0.0", previous: null, failed: ["1.0.1"], versions: ["1.0.0", "1.0.1"] },
	);
}

interface FrameRead {
	readonly id: string;
	readonly src: string | null;
	readonly missing: string | null;
}

interface PageRead {
	readonly installed: {
		readonly apps: readonly { readonly current: string | null; readonly failed: readonly string[] }[];
	};
	readonly tabs: readonly { readonly id: string; readonly title: string; readonly address: string | null }[];
	readonly frames: readonly FrameRead[];
}

async function readOf(page: AskedPage): Promise<PageRead> {
	return (await page.ask("window.__appInstaller.read()")) as PageRead;
}

async function until(page: AskedPage, what: string, isMet: (read: PageRead) => boolean): Promise<PageRead> {
	const isSeen = await waitUntil(async () => isMet(await readOf(page)), WAIT_MS, STEP_MS);
	const read = await readOf(page);
	check(what, isSeen, true);

	if (!isSeen) {
		console.log(JSON.stringify(read));
	}

	return read;
}

function srcOf(read: PageRead, id: string): string | null {
	return read.frames.find((frame) => frame.id === id)?.src ?? null;
}

function titleOf(read: PageRead, id: string): string | null {
	return read.tabs.find((tab) => tab.id === id)?.title ?? null;
}

async function servedInstaller(): Promise<Server> {
	const bundle = await bundleOf("tools/app-installer-page.tsx");
	const releases = Object.fromEntries(HELLO_RELEASES.map(({ version }) => [version, releaseReadOf(version)]));
	const pageHtml = `<!doctype html><html><head><meta charset="utf-8"></head>
<body><div id="root"></div><pre id="boom"></pre>
<script>window.__RELEASES__ = ${JSON.stringify(releases)};</script>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;
	const server = createServer((request, response) => {
		const asked = /^\/apps\/hello\/(\d+\.\d+\.\d+)\/([a-z.-]+)$/.exec(request.url ?? "");

		if (asked === null) {
			response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			response.end(pageHtml);
			return;
		}

		const origin = `http://${request.headers.host ?? ""}`;
		response.writeHead(200, {
			"Content-Type": asked[2]?.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8",
			"Content-Security-Policy": framePolicyServedFrom("hello", origin),
		});
		response.end(readFileSync(path.join(helloReleaseFolderOf(HELLO_ROOT, asked[1] ?? ""), asked[2] ?? "")));
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	return server;
}

async function frameChecks(): Promise<void> {
	const server = await servedInstaller();
	const { port } = server.address() as AddressInfo;
	const page = await paged(`http://127.0.0.1:${port}/`, GATE, { size: [900, 700] });

	try {
		const isStarted = await waitUntil(
			async () => (await page.ask("window.__appInstaller !== undefined")) === true,
			WAIT_MS,
			STEP_MS,
		);
		check("the page started", isStarted ? "" : await page.ask(`document.querySelector("#boom").textContent`), "");
		await until(page, "before install, both tabs draw the missing app and offer the install", (read) =>
			read.frames.every((frame) => frame.missing?.includes("Install hello") === true),
		);
		await page.ask(`window.__appInstaller.place("1.0.0")`);
		await page.ask("window.__appInstaller.install()");
		const welcomed = await until(page, "after install, both frames run 1.0.0 and say their title to Places", (read) =>
			["t1", "t2"].every(
				(id) => srcOf(read, id)?.includes("/1.0.0/") === true && titleOf(read, id) === "Hello 1.0.0 in Widgetarium",
			),
		);
		check(
			"the welcome carried the workspace and the app's title reached the tab",
			titleOf(welcomed, "t1"),
			"Hello 1.0.0 in Widgetarium",
		);

		await page.ask(`window.__appInstaller.recordAddress("t2", "/go")`);
		await until(
			page,
			"a navigated event is recorded by Places for that tab",
			(read) => read.tabs.find((tab) => tab.id === "t2")?.address === "/page-2",
		);

		await updateChecks(page);
		check("nothing on the page failed", await page.ask(`document.querySelector("#boom").textContent`), "");
	} finally {
		page.close();
		server.close();
	}
}

async function updateChecks(page: AskedPage): Promise<void> {
	await page.ask(`window.__appInstaller.place("1.0.1")`);
	await page.ask("window.__appInstaller.updateApps()");
	const updated = await until(
		page,
		"an update reloads the hidden frame at once",
		(read) => srcOf(read, "t2")?.includes("/1.0.1/") === true,
	);
	check("the shown busy frame keeps its version while busy", srcOf(updated, "t1")?.includes("/1.0.0/"), true);
	await new Promise((settle) => setTimeout(settle, 1000));
	check("the shown busy frame still waits a second later", srcOf(await readOf(page), "t1")?.includes("/1.0.0/"), true);

	await page.ask(`window.__appInstaller.recordAddress("t1", "/idle")`);
	await until(
		page,
		"the shown frame reloads on the new version once it says busy:false",
		(read) => srcOf(read, "t1")?.includes("/1.0.1/") === true && titleOf(read, "t1") === "Hello 1.0.1 in Widgetarium",
	);

	await page.ask(`window.__appInstaller.place("1.0.2")`);
	await page.ask("window.__appInstaller.updateApps()");
	await until(page, "the broken 1.0.2 is loaded first", (read) =>
		read.frames.some((frame) => frame.src?.includes("/1.0.2/") === true),
	);
	const rolledBack = await until(
		page,
		"1.0.2 never says ready, is marked failed and every frame comes back on 1.0.1",
		(read) =>
			read.frames.every((frame) => frame.src?.includes("/1.0.1/") === true) &&
			read.installed.apps[0]?.failed.includes("1.0.2") === true,
	);
	check("the installer's current version after the rollback", rolledBack.installed.apps[0]?.current, "1.0.1");
}

try {
	await fleetChecks();
	await moduleChecks();
	await pageFactChecks();
	await frameChecks();
} finally {
	rmSync(HELLO_ROOT, {
		recursive: true,
		force: true,
	});
}

console.log(tally.failed ? `app installer: ${tally.failed} check(s) failed` : "app installer: all checks passed");
process.exit(tally.failed ? 1 : 0);
