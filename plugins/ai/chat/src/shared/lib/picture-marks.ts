export const PICTURE_ATTRIBUTE = "data-picture";

export const PICTURE_NAME_ATTRIBUTE = "data-picture-name";

export const PICTURE_SIZE_ATTRIBUTE = "data-picture-size";

export const PICTURE_GROUP_ATTRIBUTE = "data-picture-group";

export const PICTURE_GROUP_MARKS: Readonly<Record<string, string>> = {
	[PICTURE_GROUP_ATTRIBUTE]: "",
};

export interface MarkedPicture {
	readonly src: string;
	readonly name: string;
	readonly size?: string | undefined;
}

export function pictureMarksOf({ src, name, size }: MarkedPicture): Readonly<Record<string, string>> {
	const marks = {
		[PICTURE_ATTRIBUTE]: src,
		[PICTURE_NAME_ATTRIBUTE]: name,
	};
	return size === undefined ? marks : { ...marks, [PICTURE_SIZE_ATTRIBUTE]: size };
}
