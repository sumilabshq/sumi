import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { DrawingKitSchema } from "../schemas/drawing.schema.js";
import { PhotosSchema } from "../schemas/photo.schema.js";
import { AddPhoto } from "../ui/add-photo/add-photo.js";

export const addPhotoInject = inject({
	getDrawing: IQuery.output(DrawingKitSchema.nullable().default(null)),
	addPhotos: ICommand.input(PhotosSchema),
});

export const AddPhotoWidget = widget().inject(addPhotoInject).render(AddPhoto);
