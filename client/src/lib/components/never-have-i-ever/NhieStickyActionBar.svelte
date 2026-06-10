<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="fixed bottom-0 left-0 z-20 w-full">
	<div
		class="bg-background/95 border-t pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-md"
	>
		<div class="mx-auto max-w-4xl px-3 pt-3 sm:px-4">
			{@render children?.()}
		</div>
	</div>
</div>
