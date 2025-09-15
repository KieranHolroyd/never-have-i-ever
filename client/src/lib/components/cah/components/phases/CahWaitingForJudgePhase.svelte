<script lang="ts">
	import type { CAHSubmission } from '$lib/types';

	interface Props {
		submissions: CAHSubmission[];
	}

	let { submissions }: Props = $props();
</script>

<div class="text-center py-8">
	<div class="mb-6">
		<div class="inline-flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-full mb-4">
			<svg class="w-8 h-8 text-purple-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
			</svg>
		</div>
		<h2 class="text-2xl font-bold text-white mb-2">Waiting for Judgment</h2>
		<p class="text-slate-400 max-w-md mx-auto">
			The judge is reviewing all submissions and will choose the winner soon.
		</p>
	</div>

	<!-- Submissions Display -->
	<div class="max-w-4xl mx-auto">
		<h3 class="text-lg font-semibold text-white mb-4">All Submissions</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each submissions as submission, index}
				<div class="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
					<!-- Submission Header -->
					<div class="flex items-center gap-3 mb-3">
						<div class="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
							<span class="text-sm font-bold text-white">{index + 1}</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="w-5 h-5 bg-slate-500 rounded-full flex items-center justify-center">
								<span class="text-xs font-bold text-white">{submission.playerName.charAt(0).toUpperCase()}</span>
							</div>
							<span class="text-sm text-slate-300">{submission.playerName}</span>
						</div>
					</div>

					<!-- Cards -->
					<div class="space-y-2">
						{#each submission.cards as card}
							<div class="bg-white text-black rounded p-3 border-l-4 border-slate-400">
								<p class="text-sm leading-relaxed">{card.text}</p>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>