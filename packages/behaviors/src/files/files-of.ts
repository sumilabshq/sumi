export function filesOfType(list: FileList | null | undefined, typePrefix: string): File[] {
	return [...(list ?? [])].filter((file) => file.type.startsWith(typePrefix));
}
