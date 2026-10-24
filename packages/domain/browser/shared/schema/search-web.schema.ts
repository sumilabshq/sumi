import { z } from "zod";
import { searchAddressOf } from "../lib/search-address.js";

export const SearchWebSchema = z.object({ text: z.string().trim().min(1) }).transform(({ text }) => ({
	url: searchAddressOf(text),
}));
