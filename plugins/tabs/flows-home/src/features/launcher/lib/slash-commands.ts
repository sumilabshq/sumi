import type { Launch, LaunchAct } from "./launch-types.js";

interface SlashCommand {
	readonly name: string;
	readonly label: string;
	readonly act: LaunchAct;
}

const COMMAND_TAG = "Command";

const SLASH_COMMANDS: readonly SlashCommand[] = [
	{
		name: "new flow",
		label: "New flow",
		act: { kind: "new-flow" },
	},
	{
		name: "new chat",
		label: "New chat",
		act: {
			kind: "intent",
			intent: { do: "run", command: "new-chat" },
		},
	},
	{
		name: "new window",
		label: "New window",
		act: {
			kind: "intent",
			intent: { do: "run", command: "new-window" },
		},
	},
];

export function slashLaunchOf(typedAfterSlash: string): Launch | null {
	const wanted = typedAfterSlash.trim().toLowerCase();

	if (wanted === "") {
		return null;
	}

	const found = SLASH_COMMANDS.find(({ name }) => name.startsWith(wanted));
	return found === undefined ? null : { act: found.act, label: found.label, tag: COMMAND_TAG };
}
