import { PICTURE_ATTRIBUTE, PICTURE_GROUP_ATTRIBUTE, pictureMarksOf } from "@sumi/chat-plugin";
import { GALLERY_CLASS, IMAGE_CAPTION_ATTRIBUTE, IMAGE_CLASS } from "@widgetarium/markdown";

const WEB_IMAGE_SELECTOR = `img.${IMAGE_CLASS}:not([${PICTURE_ATTRIBUTE}])`;
const GALLERY_SELECTOR = `.${GALLERY_CLASS}:not([${PICTURE_GROUP_ATTRIBUTE}])`;

export function marksSaidPictures(node: HTMLElement): void {
	for (const gallery of node.querySelectorAll(GALLERY_SELECTOR)) {
		gallery.setAttribute(PICTURE_GROUP_ATTRIBUTE, "");
	}

	for (const image of node.querySelectorAll<HTMLImageElement>(WEB_IMAGE_SELECTOR)) {
		for (const [name, value] of Object.entries(pictureMarksOf({ src: image.src, name: image.getAttribute(IMAGE_CAPTION_ATTRIBUTE) ?? image.alt }))) {
			image.setAttribute(name, value);
		}
	}
}
