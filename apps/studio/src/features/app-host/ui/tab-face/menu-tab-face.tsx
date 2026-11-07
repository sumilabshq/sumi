import { createElement as h } from "react";
import type { ReactElement } from "react";
import { TabArtSchema } from "@widgetarium/app-host";
import type { TabFaceProps } from "@sumi/sumi-host-plugin";
import { TabFaceIcon } from "./tab-face-icon.js";

const UNKNOWN_ART = "site";

export function MenuTabFace({ art, favicon, title, address, mark }: TabFaceProps): ReactElement {
	return (
		<TabFaceIcon
			icon={TabArtSchema.catch(UNKNOWN_ART).parse(art)}
			favicon={favicon}
			title={title}
			address={address}
			mark={mark}
			size="row"
		/>
	);
}
