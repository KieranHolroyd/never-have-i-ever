<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let barEl: HTMLDivElement | undefined = $state();

	onMount(() => {
		if (!barEl) return;

		const syncHeight = () => {
			document.documentElement.style.setProperty('--nhie-sticky-bar-height', `${barEl!.offsetHeight}px`);
		};

		syncHeight();
		const observer = new ResizeObserver(syncHeight);
		observer.observe(barEl);

		return () => {
			observer.disconnect();
		};
	});
</script>

<div bind:this={barEl} class="fixed inset-x-0 bottom-0 z-20 w-full max-w-[100vw]">
	<div
		class="bg-background/95 border-t pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md"
	>
		<div class="mx-auto max-w-4xl px-3 pt-2.5 sm:px-4 sm:pt-3">
			{@render children?.()}
		</div>
	</div>
</div>
