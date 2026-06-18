<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="fixed inset-x-0 bottom-0 z-20 w-full max-w-[100vw]">
	<div
		class="bg-background/95 border-t pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur-md"
	>
		<div class="mx-auto max-w-4xl px-3 pt-2.5 sm:px-4 sm:pt-3">
			{@render children?.()}
		</div>
	</div>
</div>
