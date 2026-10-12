const UTILITIES: Readonly<Record<string, string>> = {
	flex: "display: flex",
	"flex-col": "flex-direction: column",
	"flex-row": "flex-direction: row",
	"flex-1": "flex: 1 1 0%",
	"items-center": "align-items: center",
	"justify-between": "justify-content: space-between",
	"gap-1": "gap: 4px",
	"gap-2": "gap: 8px",
	"gap-4": "gap: 16px",
	"p-6": "padding: 24px",
	"px-3": "padding-left: 12px; padding-right: 12px",
	"px-4": "padding-left: 16px; padding-right: 16px",
	"py-2": "padding-top: 8px; padding-bottom: 8px",
	"text-xs": "font-size: var(--wg-kit-text-xs)",
	"text-sm": "font-size: var(--wg-kit-text-s)",
	"text-lg": "font-size: var(--wg-kit-text-l)",
	"font-semibold": "font-weight: 600",
	"rounded-lg": "border-radius: var(--radius)",
	"bg-muted": "background: var(--muted)",
	"bg-primary": "background: var(--primary)",
	"text-primary-foreground": "color: var(--primary-foreground)",
	"text-muted-foreground": "color: var(--muted-foreground)",
};

// TRADE-OFF: the fixture's few Tailwind utilities written by hand; the repository ships no Tailwind compiler to run here
export const FIXTURE_UTILITIES = [
	...Object.entries(UTILITIES).map(([name, rule]) => `.wg-studio-drawn .${name} { ${rule}; }`),
	".wg-studio-drawn .hover\\:bg-fill-hover:hover { background: var(--wg-kit-fill-hover); }",
].join("\n");
