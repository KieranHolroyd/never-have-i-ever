<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		show?: boolean;
		children?: import('svelte').Snippet;
	}

	let { show = false, children }: Props = $props();

	const dispatch = createEventDispatcher();
</script>

{#if show}
	<div class="fixed top-2 left-2 right-2 z-50">
		<div
			class="rounded-lg border border-black dark:border-white bg-gray-200 dark:bg-gray-800 dark:text-white text-center py-4 px-8"
		>
			{@render children?.()}
			<br />
			<button
				class="uppercase text-xs bg-gray-400 hover:bg-gray-500"
				onclick={() => dispatch('closeNotification')}
			>
				Close
			</button>
		</div>
	</div>
{/if}
