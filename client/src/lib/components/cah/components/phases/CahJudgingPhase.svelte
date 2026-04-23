<script lang="ts">
	import type { CAHSubmission } from '$lib/types';

	interface Props {
		submissions: CAHSubmission[];
		onSelectWinner: (playerId: string) => void;
	}

	let { submissions, onSelectWinner }: Props = $props();
</script>

<div class="space-y-5">
	<section class="rounded-[28px] border border-slate-700/70 bg-slate-900/70 p-5 shadow-xl ring-1 ring-white/5 backdrop-blur-sm sm:p-6">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<p class="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Judge Panel</p>
				<h3 class="mt-2 text-2xl font-semibold text-white">Pick the round winner</h3>
				<p class="mt-2 max-w-2xl text-sm text-slate-400">
					Read every anonymous submission, then tap the funniest one. The winning player earns the point and becomes the next judge.
				</p>
			</div>
			<div class="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-200">
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				{submissions.length} submissions ready
			</div>
		</div>
	</section>

	<div class="grid gap-4 xl:grid-cols-2">
		{#each submissions as submission, index (submission.playerId)}
			<button
				class="group rounded-[24px] border border-slate-700/70 bg-slate-950/75 p-5 text-left shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/50 hover:bg-slate-950"
				onclick={() => onSelectWinner(submission.playerId)}
				style="animation-delay: {index * 100}ms"
			>
				<div class="flex items-start justify-between gap-3">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-sm font-bold text-amber-200 ring-1 ring-amber-400/20">
							{index + 1}
						</div>
						<div>
							<p class="text-sm font-semibold text-white">Submission #{index + 1}</p>
							<p class="text-xs text-slate-500">Anonymous until you choose</p>
						</div>
					</div>
					<div class="rounded-full border border-slate-700/70 bg-slate-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
						Tap to award point
					</div>
				</div>

				<div class="mt-4 space-y-3">
					{#each submission.cards as card (card.id)}
						<div class="rounded-2xl bg-white p-4 text-black shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
							<p class="text-sm leading-relaxed">{card.text}</p>
						</div>
					{/each}
				</div>

				<div class="mt-5 flex items-center justify-between border-t border-slate-800 pt-4 text-sm">
					<span class="text-slate-400">Best answer wins this round</span>
					<span class="font-semibold text-amber-200">Choose winner</span>
				</div>
			</button>
		{/each}
	</div>
</div>
