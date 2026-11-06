export function isComponent(value: unknown): boolean {
	return typeof value === "function" || (typeof value === "object" && value !== null && "$$typeof" in value);
}
