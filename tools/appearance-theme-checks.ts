import { runtime, localTransport, orpcTransport } from "@widgetarium/data-framework";
import { dataFrameworkMiddleware } from "@widgetarium/data-framework/server";
import { appearance as appearanceContract } from "../packages/state/appearance/generated/contract.ts";
import type { SystemScheme } from "../packages/state/appearance/generated/module.ts";
import { appearance as appearanceModule } from "../packages/state/appearance/generated/module.ts";
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
	const answer = await frame.send(appearanceContract.theme.theme);
	return answer.ok ? [answer.output.scheme, answer.output.choice] : answer.reason;
}

console.info = () => undefined;
check("the theme follows the system while nothing is chosen", await themeOf(), ["light", "system"]);
await studio.send(appearanceContract.theme.chooseTheme, { choice: "dark" });
check("a choice made in the studio is what an app reads", await themeOf(), ["dark", "dark"]);
system.flip();
check("a chosen theme stays when the system changes", await themeOf(), ["dark", "dark"]);
await studio.send(appearanceContract.theme.chooseTheme, { choice: "system" });
check("back to the system, the system's scheme is read", await themeOf(), ["dark", "system"]);
const byApp = await frame.send(appearanceContract.theme.chooseTheme, { choice: "light" });
check("an app cannot choose Sumi's theme", byApp.ok ? "chosen" : byApp.code, "forbidden");
check("a change reaches listeners as a re-read of theme", heard.includes("appearance.theme.theme"), true);
await new Promise((settled) => setTimeout(settled, 100));
heard.length = 0;
system.flip();
await new Promise((settled) => setTimeout(settled, 100));
check("a system scheme change reaches listeners as a re-read of theme", heard.includes("appearance.theme.theme"), true);

console.log(tally.failed ? `appearance theme: ${tally.failed} check(s) failed` : "appearance theme: all checks passed");
process.exit(tally.failed ? 1 : 0);
