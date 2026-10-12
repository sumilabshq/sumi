import { useEffect, useState } from "react";

export function useOpensToPicked(holdsPicked: boolean): readonly [boolean, (isOpen: boolean) => void] {
	const [isOpen, setOpen] = useState(true);
	useEffect(() => {
		if (holdsPicked) setOpen(true);
	}, [holdsPicked]);
	return [isOpen, setOpen];
}
