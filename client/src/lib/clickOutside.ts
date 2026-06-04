type ClickOutsideOptions = {
	onClose: () => void;
	/** When false, outside clicks are ignored (e.g. panel closed). */
	isActive?: () => boolean;
	/** Clicks on matching elements are ignored (e.g. the open/close toggle in the navbar). */
	exclude?: string;
};

export default function clickOutside(node: EventTarget, options: ClickOutsideOptions) {
	const handleClick = (event: MouseEvent) => {
		if (options.isActive && !options.isActive()) {
			return;
		}

		const path = event.composedPath();

		if (options.exclude) {
			const excluded = path.some(
				(el) => el instanceof Element && el.closest(options.exclude!) !== null
			);
			if (excluded) return;
		}

		if (!path.includes(node)) {
			options.onClose();
		}
	};

	document.addEventListener('click', handleClick);

	return {
		update(newOptions: ClickOutsideOptions) {
			options = newOptions;
		},
		destroy() {
			document.removeEventListener('click', handleClick);
		}
	};
}
