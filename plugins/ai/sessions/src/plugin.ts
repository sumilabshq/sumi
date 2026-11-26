import { chat } from "@sumi/chat-plugin";
import { shell, windows } from "@sumi/sumi-host-plugin";
import { sessions as sessionsModule } from "@sumi/sessions/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { ChatHeadTitle } from "./features/sessions/ui/chat-head-title/chat-head-title.js";
import { SessionsPicker } from "./features/sessions/ui/sessions-picker/sessions-picker.js";
import { windowAppProviderOf } from "./features/sessions/ui/window-app-provider/window-app-provider.js";
import metadata from "../metadata.json" with { type: "json" };

export const sessions = plugin("sessions")
	.describe(metadata)
	.require(windows, shell, chat)
	.apply((app) => {
		app.use(windows).module(sessionsModule);
		app.use(shell).provider(windowAppProviderOf);
		app.use(chat).slots.headTitle.replace(ChatHeadTitle);
		app.use(chat).slots.emptyOptions.add(SessionsPicker);
	});
