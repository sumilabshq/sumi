import { AppsModule } from "../plugins/apps/data/apps/module.ts";
import { faceOf } from "../plugins/apps/src/features/app-tab/lib/face-of.ts";
import { AppSchema, AppsSlot } from "../plugins/apps/src/slots.ts";
import { BROWSER_PAGE_ICON } from "../plugins/browser-page/src/features/browser-page/lib/browser-page-icon.ts";
import { LazyBrowserPageView } from "../plugins/browser-page/src/features/browser-page/lib/lazy-browser-page-view.ts";
import { ChatPlugin } from "../plugins/chat/src/plugin.ts";
import { MainPlugin } from "../plugins/main/src/plugin.ts";
import { LazyTerminalView } from "../plugins/terminal/src/features/terminal/lib/lazy-terminal-view.ts";
import { TERMINAL_ICON } from "../plugins/terminal/src/features/terminal/lib/terminal-icon.ts";

export const TERMINAL_FACE = faceOf({ id: "terminal", title: "Terminal", icon: TERMINAL_ICON, view: LazyTerminalView });

export const BROWSER_PAGE_FACE = faceOf({
	id: "browser-page",
	title: "Browser",
	icon: BROWSER_PAGE_ICON,
	view: LazyBrowserPageView,
});

export const BUILT_IN_FACES = [MainPlugin, ChatPlugin].flatMap((filler) =>
	filler.parts.fills
		.filter(({ slot }) => slot === AppsSlot)
		.map(({ id, item }) => faceOf({ id, ...AppSchema.parse(item) })),
);

export const PluginAppsModule = AppsModule({ apps: [...BUILT_IN_FACES, TERMINAL_FACE, BROWSER_PAGE_FACE] });
