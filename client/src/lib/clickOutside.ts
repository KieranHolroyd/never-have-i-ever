export default function clickOutside(node: EventTarget, onEventFunction: () => void) {
	const handleClick = (event: MouseEvent) => {
		var path = event.composedPath();

		if (!path.includes(node)) {
			onEventFunction();
		}
	};

	document.addEventListener('click', handleClick);

	return {
		destroy() {
			document.removeEventListener('click', handleClick);
		}
	};
}
