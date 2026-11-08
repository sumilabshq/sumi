import { AppKindSchema } from "@widgetarium/app-host/contract";
import type { apps } from "@sumi/apps/contract";
import type { OutputOf } from "@widgetarium/data-framework";

type AppFace = OutputOf<typeof apps.apps.all>["apps"][number];

export function openableAppsOf(faces: readonly AppFace[]): readonly AppFace[] {
	return faces.filter(({ id }) => AppKindSchema.safeParse(id).success);
}
