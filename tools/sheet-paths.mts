export const BOARD_SHEET = "packages/shared/core/board.css";

export const BROWSER_HOST_SHEET = "packages/shared/core/browser-host.css";

export const BROWSER_SHEET_SOURCES: readonly string[] = [BROWSER_HOST_SHEET, BOARD_SHEET];

export const COMPOSER_SHEET_SOURCES: readonly string[] = [
	"design-systems/sumi/sumi.css",
	"plugins/ai/chat/src/features/assistant/ui/assistant-panel/assistant.css",
	"plugins/ai/chat/src/features/assistant/ui/assistant-panel/assistant-utilities.css",
	"plugins/ai/plan-usage/src/features/plan-usage/ui/usage-button/usage-button.css",
	"plugins/ai/model-picker/src/features/model-picker/ui/model-button/model-button.css",
	"plugins/ai/effort-picker/src/features/effort-picker/ui/effort-button/effort-button.css",
	"plugins/ai/composer-expand/src/features/composer-expand/ui/expand-frame/expand-frame.css",
	"plugins/ai/composer-expand/src/features/composer-expand/ui/expand-toggle/expand-toggle.css",
];
