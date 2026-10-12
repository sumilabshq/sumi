import { IQuery, inject, widget } from "@widgetarium/core";
import { FramePicturesSchema } from "../schemas/frame-picture.schema.js";
import { PicturesProgress } from "../ui/pictures-progress/pictures-progress.js";

export const picturesProgressInject = inject({
	framePicturesQuery: IQuery.output(FramePicturesSchema.default({ shown: {}, waiting: 0 })),
});

export const PicturesProgressWidget = widget().inject(picturesProgressInject).render(PicturesProgress);
