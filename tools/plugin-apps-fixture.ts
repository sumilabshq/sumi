import { apps as appsModule } from "../plugins/apps/data/apps/generated/module.ts";
import { faceOf } from "../plugins/apps/src/features/app-tab/lib/face-of.ts";
import { appsFilledBy } from "./apps-filled-fixture.ts";
import { BROWSER_PAGE_ICON } from "../plugins/browser-page/src/features/browser-page/lib/browser-page-icon.ts";
import { LazyBrowserPageView } from "../plugins/browser-page/src/features/browser-page/lib/lazy-browser-page-view.ts";
import { chat } from "../plugins/ai/chat/src/index.ts";
import { main } from "../plugins/main/src/index.ts";
import { agent } from "../plugins/ai/agent/src/index.ts";
import { tasks } from "../plugins/tasks/src/index.ts";
import { canvas } from "../plugins/canvas/src/index.ts";
import { LazyTerminalView } from "../plugins/terminal/src/features/terminal/lib/lazy-terminal-view.ts";
import { TERMINAL_ICON } from "../plugins/terminal/src/features/terminal/lib/terminal-icon.ts";

export const TERMINAL_FACE = faceOf({ id: "terminal", title: "Terminal", icon: TERMINAL_ICON, view: LazyTerminalView });

export const BROWSER_PAGE_FACE = faceOf({
	id: "browser-page",
	title: "Browser",
	icon: BROWSER_PAGE_ICON,
	view: LazyBrowserPageView,
});

export const BUILT_IN_FACES = appsFilledBy([main, chat, agent, tasks, canvas]).map(faceOf);

export const PluginAppsModule = appsModule({ apps: [...BUILT_IN_FACES, TERMINAL_FACE, BROWSER_PAGE_FACE] });
