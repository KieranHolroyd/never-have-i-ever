<script lang="ts">
	import { settingsStore } from '$lib/settings';
	import { Tutorial } from '$lib/tutorial';

	interface Props {
		id: string;
		title: string;
		children?: import('svelte').Snippet;
	}

	let { id, title, children }: Props = $props();

	let hidden = $state(false);

	let isShown = $derived(!Tutorial.isSeen(id) && $settingsStore.no_tutorials !== true);

	function markAsSeen() {
		Tutorial.markAsSeen(id);
		hidden = true;
	}
</script>

{#if isShown && !hidden}
	<div class="fixed top-2 left-2 right-2 z-50">
		<div class="text-left panel py-4 px-8 max-h-[calc(100vh-1rem)] overflow-auto">
			<div class="mx-auto prose-panel lg:prose-xl">
				<h1 class="text-center">{title}</h1>
				{@render children?.()}
				<div class="flex justify-end">
					<button
						class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
						onclick={markAsSeen}
					>
						Continue
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
