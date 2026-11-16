import { chat } from "@sumi/chat-plugin";
import { shell, windows } from "@sumi/sumi-host-plugin";
import { sessions as sessionsModule } from "@sumi/sessions/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { SessionsButton } from "./features/sessions/ui/sessions-button/sessions-button.js";
import { windowAppProviderOf } from "./features/sessions/ui/window-app-provider/window-app-provider.js";

export const sessions = plugin("sessions")
	.require(windows, shell, chat)
	.apply((app) => {
		app.use(windows).module(sessionsModule);
		app.use(shell).provider(windowAppProviderOf);
		app.use(chat).slots.topStart.add(SessionsButton);
	});
