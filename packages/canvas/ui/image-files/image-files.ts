export function imageFilesIn(list: FileList | null | undefined): File[] {
	return [...(list ?? [])].filter((file) => file.type.startsWith("image/"));
}
