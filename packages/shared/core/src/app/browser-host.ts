import { refusingConsole } from "../engine/host-console.js";
import type { Navigation } from "../gateway/host.js";
import type { SurfaceHost } from "../surface/use-surface-shared.js";

const BROWSER = "browser";
const NO_CONSOLE = "a browser app has no console";

export function browserHostOf(navigator: Navigation, pathname: string): SurfaceHost {
	return {
		platform: BROWSER,
		type: BROWSER,
		can: { catalogue: false, fullscreen: false, subscribe: false, network: false, renderMarkdown: false },
		console: refusingConsole(NO_CONSOLE),
		ui: { notify: (said) => console.info(`[widgetarium] ${said}`), renderMarkdown: () => () => {} },
		here: null,
		navigator,
		notePath: pathname,
	};
}
