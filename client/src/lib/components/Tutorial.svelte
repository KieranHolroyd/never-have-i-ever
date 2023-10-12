<script lang="ts">
	import { Tutorial } from '$lib/tutorial';

	export let id: string;
	export let title: string;

	let hidden = false;

	$: isShown = !Tutorial.isSeen(id);

	function markAsSeen() {
		Tutorial.markAsSeen(id);
		hidden = true;
	}
</script>

{#if isShown && !hidden}
	<div class="fixed top-2 left-2 right-2 z-50">
		<div
			class="text-left rounded-lg border border-black dark:border-white bg-gray-200 dark:bg-gray-800 py-4 px-8 max-h-[calc(100vh-1rem)] overflow-auto"
		>
			<div class="mx-auto prose lg:prose-xl dark:prose-invert">
				<h1 class="text-center">{title}</h1>
				<slot />
				<div class="flex justify-end">
					<button
						class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
						on:click={markAsSeen}
					>
						Continue
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
