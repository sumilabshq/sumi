import { AppsModule } from "../plugins/apps/data/apps/module.ts";
import { faceOf } from "../plugins/apps/src/face-of.ts";
import { LazyTerminalView } from "../plugins/terminal/src/lazy-terminal-view.ts";
import { TERMINAL_ICON } from "../plugins/terminal/src/terminal-icon.ts";

export const TERMINAL_FACE = faceOf({ id: "terminal", title: "Terminal", icon: TERMINAL_ICON, view: LazyTerminalView });

export const TerminalAppsModule = AppsModule({ apps: [TERMINAL_FACE] });
