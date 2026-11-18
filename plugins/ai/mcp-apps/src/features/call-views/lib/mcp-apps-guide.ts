const GUIDE = `## MCP apps

Some of your tools draw their result as a live card in the chat, right under the call: an MCP app. Call one when seeing the thing helps more than describing it, and whenever the person asks to see MCP apps or what they look like. Sumi's tab apps (tabs_tab_open) are not MCP apps.

{guides}`;

export function mcpAppsGuideOf(guides: readonly string[]): string {
	if (guides.length === 0) {
		return "";
	}

	return GUIDE.replace("{guides}", guides.map((guide) => `- ${guide}`).join("\n"));
}
