import type { Runtime } from "@widgetarium/data-framework";
import { runtime, localTransport, orpcTransport } from "@widgetarium/data-framework";
import { dataFrameworkMiddleware } from "@widgetarium/data-framework/server";
import { appearance as appearanceContract } from "../packages/state/appearance/generated/contract.ts";
import type { SystemScheme } from "../packages/state/appearance/generated/module.ts";
import { appearance as appearanceModule } from "../packages/state/appearance/generated/module.ts";
import { APP_CALLER_HEADER, AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { StoreClient, memoryStoreInvoke } from "../packages/shared/behaviors/tauri-store.ts";
import { check, tally } from "./check-helpers.ts";

class FakeSystemScheme implements SystemScheme {
	matches = false;
	private readonly listeners = new Set<(change: { readonly matches: boolean }) => void>();

	addEventListener(_type: "change", listener: () => void): void {
		this.listeners.add(listener);
	}

	removeEventListener(_type: "change", listener: () => void): void {
		this.listeners.delete(listener);
	}

	flip(): void {
		this.matches = !this.matches;
		this.listeners.forEach((listener) =>
			listener({
				matches: this.matches,
			}),
		);
	}
}

const system = new FakeSystemScheme();
const local = localTransport();
const appearance = runtime()
	.modules(
		appearanceModule({
			systemScheme: system,
		}),
	)
	.start({
		platform: "server",
		env: {},
		scope: { workspaceId: "checks" },
	});
const authenticate = new AppCallerAuthenticate();
local.serve(appearance, { authenticate });
const served = dataFrameworkMiddleware(appearance, { authenticate });
const studio = runtime()
	.imports(appearanceContract({ over: local }))
	.start();
const frame = runtime()
	.imports(
		appearanceContract({
			over: orpcTransport("http://appearance.test", {
				fetch: served.fetch,
				headers: () => ({ [APP_CALLER_HEADER]: "tasks" }),
			}),
		}),
	)
	.start();
const heard: string[] = [];
local.changes((invalidated) => heard.push(...invalidated.map(({ query }) => query)));

async function themeOf(): Promise<unknown> {
	const answer = await frame.send(appearanceContract.theme.current);
	return answer.ok ? [answer.output.scheme, answer.output.choice] : answer.reason;
}

console.info = () => undefined;
check("the theme follows the system while nothing is chosen", await themeOf(), ["light", "system"]);
await studio.send(appearanceContract.theme.choose, { choice: "dark" });
check("a choice made in the studio is what an app reads", await themeOf(), ["dark", "dark"]);
system.flip();
check("a chosen theme stays when the system changes", await themeOf(), ["dark", "dark"]);
await studio.send(appearanceContract.theme.choose, { choice: "system" });
check("back to the system, the system's scheme is read", await themeOf(), ["dark", "system"]);
const byApp = await frame.send(appearanceContract.theme.choose, { choice: "light" });
check("an app cannot choose Sumi's theme", byApp.ok ? "chosen" : byApp.code, "forbidden");
check("a change reaches listeners as a re-read of theme", heard.includes("appearance.theme.current"), true);
await new Promise((settled) => setTimeout(settled, 100));
heard.length = 0;
system.flip();
await new Promise((settled) => setTimeout(settled, 100));
check(
	"a system scheme change reaches listeners as a re-read of theme",
	heard.includes("appearance.theme.current"),
	true,
);

async function fontsOf(): Promise<unknown> {
	const answer = await studio.send(appearanceContract.fonts.current);
	return answer.ok
		? [answer.output.ui.chosen.family, answer.output.ui.isDefault, answer.output.code.chosen.family]
		: answer.reason;
}

check("fonts are the defaults while nothing is chosen", await fontsOf(), ["IBM Plex Sans", true, "JetBrains Mono"]);
await studio.send(appearanceContract.fonts.choose, { role: "ui", family: "Verdana" });
check("a chosen font is what is read", await fontsOf(), ["Verdana", false, "JetBrains Mono"]);
const unknownFont = await studio.send(appearanceContract.fonts.choose, { role: "code", family: "Verdana" });
check("a font not offered for a role is refused", unknownFont.ok, false);
const fontByApp = await frame.send(appearanceContract.fonts.choose, { role: "ui", family: "Arial" });
check("an app cannot choose Sumi's fonts", fontByApp.ok ? "chosen" : fontByApp.code, "forbidden");
await studio.send(appearanceContract.fonts.choose, { role: "ui", family: null });
check("null goes back to the default", await fontsOf(), ["IBM Plex Sans", true, "JetBrains Mono"]);

const store = new StoreClient(memoryStoreInvoke());

function keptAppearance(): Runtime {
	const started = runtime()
		.modules(appearanceModule({ systemScheme: system, tauri: { store } }))
		.start({ platform: "server", env: {}, scope: { workspaceId: "kept" } });
	const kept = localTransport();
	kept.serve(started, { authenticate });
	return runtime()
		.imports(appearanceContract({ over: kept }))
		.start();
}

const first = keptAppearance();
await new Promise((settled) => setTimeout(settled, 50));
await first.send(appearanceContract.theme.choose, { choice: "dark" });
await first.send(appearanceContract.fonts.choose, { role: "code", family: "Menlo" });
await new Promise((settled) => setTimeout(settled, 600));
const second = keptAppearance();
await new Promise((settled) => setTimeout(settled, 100));
const keptTheme = await second.send(appearanceContract.theme.current);
const keptFonts = await second.send(appearanceContract.fonts.current);
check(
	"the theme choice is read back after a restart",
	keptTheme.ok ? keptTheme.output.choice : keptTheme.reason,
	"dark",
);
check(
	"the font choice is read back after a restart",
	keptFonts.ok ? keptFonts.output.code.chosen.family : keptFonts.reason,
	"Menlo",
);

console.log(tally.failed ? `appearance theme: ${tally.failed} check(s) failed` : "appearance theme: all checks passed");
process.exit(tally.failed ? 1 : 0);
