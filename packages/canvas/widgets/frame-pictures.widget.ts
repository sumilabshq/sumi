import { ICommand, IQuery, ISlot, inject, widget } from "@widgetarium/core";
import { DrawingKitSchema } from "../schemas/drawing.schema.js";
import { FramePicturesSchema, PictureAsksSchema } from "../schemas/frame-picture.schema.js";
import { FramePictures } from "../ui/frame-pictures/frame-pictures.js";

export const framePicturesInject = inject({
	getDrawing: IQuery.output(DrawingKitSchema.nullable().default(null)),
	getFramePictures: IQuery.output(FramePicturesSchema.default({ shown: {}, waiting: 0 })),
	askForPictures: ICommand.input(PictureAsksSchema),
	field: ISlot,
});

export const FramePicturesWidget = widget().inject(framePicturesInject).render(FramePictures);
