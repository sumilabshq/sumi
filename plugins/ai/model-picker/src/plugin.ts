import { chat } from "@sumi/chat-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { ModelButton } from "./features/model-picker/ui/model-button/model-button.js";

export const modelPicker = plugin("model-picker")
	.require(chat)
	.apply((app) => {
		app.use(chat).slots.fieldOptions.add(ModelButton);
	});
