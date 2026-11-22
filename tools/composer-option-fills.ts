import { SlotFills } from "../packages/shared/plugin-framework/src/index.ts";
import type { SlotComponent } from "../packages/shared/plugin-framework/src/ui-slot.ts";
import type { ComposerOptionProps } from "../plugins/ai/chat/src/index.ts";
import { FolderButton } from "../plugins/ai/working-folder/src/features/working-folder/ui/folder-button/folder-button.tsx";
import { ModeButton } from "../plugins/ai/permission-mode/src/features/permission-mode/ui/mode-button/mode-button.tsx";
import { SandboxButton } from "../plugins/ai/sandbox-mode/src/features/sandbox-mode/ui/sandbox-button/sandbox-button.tsx";
import { UsageButton } from "../plugins/ai/plan-usage/src/features/plan-usage/ui/usage-button/usage-button.tsx";
import { ModelButton } from "../plugins/ai/model-picker/src/features/model-picker/ui/model-button/model-button.tsx";
import { EffortButton } from "../plugins/ai/effort-picker/src/features/effort-picker/ui/effort-button/effort-button.tsx";
import { SlashCommands } from "../plugins/ai/slash-commands/src/features/slash-menu/ui/slash-commands/slash-commands.tsx";
import { KeyboardLanguageTag } from "../plugins/ai/keyboard-language/src/features/keyboard-language/ui/keyboard-language-tag/keyboard-language-tag.tsx";

type ComposerOptionSlot = "chat.options-start" | "chat.options-end";

function fillOf(slot: ComposerOptionSlot, pluginId: string, component: SlotComponent<ComposerOptionProps>) {
	return {
		slot,
		pluginId,
		kind: "add" as const,
		component,
	};
}

export const COMPOSER_OPTION_FILLS = new SlotFills([
	fillOf("chat.options-start", "model-picker", ModelButton),
	fillOf("chat.options-start", "effort-picker", EffortButton),
	fillOf("chat.options-start", "permission-mode", ModeButton),
	fillOf("chat.options-start", "sandbox-mode", SandboxButton),
	fillOf("chat.options-start", "working-folder", FolderButton),
	fillOf("chat.options-end", "plan-usage", UsageButton),
	{
		slot: "chat.composer-input",
		pluginId: "slash-commands",
		kind: "add" as const,
		component: SlashCommands,
	},
	{
		slot: "chat.composer-input",
		pluginId: "keyboard-language",
		kind: "add" as const,
		component: KeyboardLanguageTag,
	},
]);
