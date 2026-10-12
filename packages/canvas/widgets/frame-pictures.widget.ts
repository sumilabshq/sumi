import { ICommand, IQuery, ISlot, inject, widget } from "@widgetarium/core";
import { DrawingKitSchema } from "../schemas/drawing.schema.js";
import { FramePicturesSchema, PictureAsksSchema } from "../schemas/frame-picture.schema.js";
import { FramePictures } from "../ui/frame-pictures/frame-pictures.js";

export const framePicturesInject = inject({
	drawingQuery: IQuery.output(DrawingKitSchema.nullable().default(null)),
	framePicturesQuery: IQuery.output(FramePicturesSchema.default({ shown: {}, waiting: 0 })),
	askForPicturesCommand: ICommand.input(PictureAsksSchema),
	field: ISlot,
});

export const FramePicturesWidget = widget().inject(framePicturesInject).render(FramePictures);
