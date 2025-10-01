<script lang="ts">
	import type { CAHSubmission } from '$lib/types';

	interface Props {
		submissions: CAHSubmission[];
		onSelectWinner: (playerId: string) => void;
	}

	let { submissions, onSelectWinner }: Props = $props();
</script>

<div class="mb-6">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			<h3 class="text-xl font-semibold">Time to Judge!</h3>
			<div
				class="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full text-sm text-purple-400 font-medium"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				{submissions.length} submissions
			</div>
		</div>
		<div class="text-sm text-slate-400">Choose the winner</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
		{#each submissions as submission, index (submission.playerId)}
			<button
				class="group relative bg-white text-black rounded-lg p-6 hover:bg-gray-50 border-2 border-gray-300 hover:border-purple-400 transition-all duration-200 text-left w-full shadow-md hover:shadow-lg transform hover:scale-102"
				onclick={() => onSelectWinner(submission.playerId)}
				style="animation-delay: {index * 100}ms"
			>
				<!-- Submission Badge -->
				<div
					class="absolute -top-3 -left-3 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"
				>
					{index + 1}
				</div>

				<!-- Card Content -->
				<div class="space-y-3">
					{#each submission.cards as card (card.id)}
						<div class="bg-slate-100 rounded p-3 border-l-4 border-purple-400">
							<p class="text-sm leading-relaxed">{card.text}</p>
						</div>
					{/each}
				</div>

				<div class="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
					<div
						class="flex items-center gap-2 px-3 py-1 bg-purple-500 text-white rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
					>
						<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
							<path
								d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
							/>
						</svg>
						Select Winner
					</div>
				</div>

				<!-- Hover Effect -->
				<div
					class="absolute inset-0 bg-gradient-to-r from-purple-400/0 to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"
				></div>
			</button>
		{/each}
	</div>

	<!-- Instructions -->
	<div class="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
		<div class="flex items-center justify-center gap-2 text-purple-700 mb-2">
			<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
					clip-rule="evenodd"
				/>
			</svg>
			<span class="font-semibold">Your Judgment Matters!</span>
		</div>
		<p class="text-sm text-purple-600">
			Choose the funniest card combination. The winner will get a point and become the next judge.
		</p>
	</div>
</div>

