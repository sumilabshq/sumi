import { app, localTransport, orpcTransport } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";
import {
	ChooseThemeCommand,
	ThemeQuery,
	AppearanceModule as AppearanceContract,
} from "../packages/state/appearance/index.ts";
import type { SystemScheme } from "../packages/state/appearance/module.ts";
import { AppearanceModule } from "../packages/state/appearance/module.ts";
import { APP_CALLER_HEADER, AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
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
const served = server()
	.modules(AppearanceModule)
	.listen(local)
	.start({
		env: {},
		scope: { workspaceId: "checks" },
		host: { systemScheme: system, authenticate: new AppCallerAuthenticate() },
	});
const studio = app().imports(AppearanceContract.over(local)).start();
const frame = app()
	.imports(
		AppearanceContract.over(
			orpcTransport("http://appearance.test", {
				fetch: served.fetch,
				headers: () => ({ [APP_CALLER_HEADER]: "tasks" }),
			}),
		),
	)
	.start();
const heard: string[] = [];
local.changes((invalidated) => heard.push(...invalidated.map(({ query }) => query)));

async function themeOf(): Promise<unknown> {
	const answer = await frame.send(ThemeQuery);
	return answer.ok ? [answer.output.scheme, answer.output.choice] : answer.reason;
}

console.info = () => undefined;
check("the theme follows the system while nothing is chosen", await themeOf(), ["light", "system"]);
await studio.send(ChooseThemeCommand, { choice: "dark" });
check("a choice made in the studio is what an app reads", await themeOf(), ["dark", "dark"]);
system.flip();
check("a chosen theme stays when the system changes", await themeOf(), ["dark", "dark"]);
await studio.send(ChooseThemeCommand, { choice: "system" });
check("back to the system, the system's scheme is read", await themeOf(), ["dark", "system"]);
const byApp = await frame.send(ChooseThemeCommand, { choice: "light" });
check("an app cannot choose Sumi's theme", byApp.ok ? "chosen" : byApp.code, "forbidden");
check("a change reaches listeners as a re-read of theme", heard.includes("appearance/theme"), true);
await new Promise((settled) => setTimeout(settled, 100));
heard.length = 0;
system.flip();
await new Promise((settled) => setTimeout(settled, 100));
check("a system scheme change reaches listeners as a re-read of theme", heard.includes("appearance/theme"), true);

console.log(tally.failed ? `appearance theme: ${tally.failed} check(s) failed` : "appearance theme: all checks passed");
process.exit(tally.failed ? 1 : 0);
