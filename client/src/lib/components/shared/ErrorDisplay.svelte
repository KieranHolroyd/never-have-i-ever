<script lang="ts">
	import { errorStore, clearError } from '../../stores/game-store';
	import { fade } from 'svelte/transition';

	interface Props {
		autoHide?: boolean;
		autoHideDelay?: number;
	}

	let { autoHide = true, autoHideDelay = 5000 }: Props = $props();

	let error = $errorStore;

	// Auto-hide error after delay
	$effect(() => {
		if (error && autoHide) {
			setTimeout(() => {
				clearError();
			}, autoHideDelay);
		}
	});
</script>

{#if error}
	<div
		class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4"
		transition:fade={{ duration: 200 }}
	>
		<div class="flex items-start justify-between">
			<div class="flex items-start gap-3">
				<div class="flex-shrink-0">
					<svg class="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
				</div>
				<div>
					<h3 class="text-sm font-medium text-red-400 mb-1">Error</h3>
					<p class="text-sm text-red-300">{error.message}</p>
				</div>
			</div>
			<button
				onclick={clearError}
				class="flex-shrink-0 ml-4 p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
				aria-label="Dismiss error"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>
	</div>
{/if}