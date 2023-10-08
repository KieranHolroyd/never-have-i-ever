<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let show_notification = false;
	export let notification_content = '';

	const dispatch = createEventDispatcher();
</script>

{#if show_notification}
	<div class="fixed bottom-0 left-0 right-0 z-50">
		<div
			class="border border-black dark:border-white bg-gray-200 dark:bg-gray-800 dark:text-white text-center py-2 px-4"
		>
			{notification_content}
			<button
				class="uppercase text-xs bg-gray-400 hover:bg-gray-500"
				on:click={() => dispatch('closeNotification')}
			>
				Close
			</button>
		</div>
	</div>
{/if}
