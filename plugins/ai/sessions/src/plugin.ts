import { chat } from "@sumi/chat-plugin";
import { shell, windows } from "@sumi/sumi-host-plugin";
import { sessions as sessionsModule } from "@sumi/sessions/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { SessionsChevron } from "./features/sessions/ui/sessions-chevron/sessions-chevron.js";
import { SessionsPicker } from "./features/sessions/ui/sessions-picker/sessions-picker.js";
import { windowAppProviderOf } from "./features/sessions/ui/window-app-provider/window-app-provider.js";

export const sessions = plugin("sessions")
	.require(windows, shell, chat)
	.apply((app) => {
		app.use(windows).module(sessionsModule);
		app.use(shell).provider(windowAppProviderOf);
		app.use(chat).slots.headTools.add(SessionsChevron);
		app.use(chat).slots.emptyOptions.add(SessionsPicker);
	});
