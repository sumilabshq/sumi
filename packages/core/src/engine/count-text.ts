export function countText(count: number, one: string, many: string): string {
	return count === 1 ? one : many.replace("{count}", String(count));
}
