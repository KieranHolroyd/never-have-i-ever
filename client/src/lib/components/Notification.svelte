<script lang="ts">
	import { createEventDispatcher } from 'svelte';
    import { fade, scale } from 'svelte/transition';
    import { quintOut, backOut } from 'svelte/easing';

	interface Props {
		show?: boolean;
		children?: import('svelte').Snippet;
		showReloadButton?: boolean;
	}

	let { show = false, children, showReloadButton = false }: Props = $props();

	const dispatch = createEventDispatcher();

	function reloadPage() {
		window.location.reload();
	}
</script>

{#if show}
	<div class="fixed top-2 left-2 right-2 z-50" transition:fade={{ duration: 140, easing: quintOut }}>
		<div class="panel text-center py-4 px-8" in:scale={{ start: 0.96, duration: 200, easing: backOut }}>
			{@render children?.()}
			<br />
			<div class="flex justify-center gap-2 mt-2">
				{#if showReloadButton}
					<button
						class="uppercase text-xs bg-green-500 hover:bg-green-600 px-3 py-1 rounded"
						onclick={reloadPage}
					>
						Reload
					</button>
				{/if}
				<button
					class="uppercase text-xs bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded"
					onclick={() => dispatch('closeNotification')}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
