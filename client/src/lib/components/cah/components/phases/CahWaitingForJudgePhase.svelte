<script lang="ts">
	import type { CAHSubmission } from '$lib/types';

	interface Props {
		submissions: CAHSubmission[];
	}

	let { submissions }: Props = $props();
</script>

<div class="space-y-5">
	<section
		class="rounded-[28px] border border-slate-700/70 bg-slate-900/70 p-5 text-center shadow-xl ring-1 ring-white/5 backdrop-blur-sm sm:p-6"
	>
		<div class="mb-6">
			<div
				class="inline-flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/25 bg-amber-500/10 mb-4"
			>
				<svg class="h-8 w-8 text-amber-300 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<p class="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Judging</p>
			<h2 class="mt-2 text-2xl font-bold text-white mb-2">The Judge Is Deciding</h2>
			<p class="text-slate-400 max-w-md mx-auto">
				All {submissions.length} submission{submissions.length === 1 ? '' : 's'} are in. Waiting for the
				judge to pick a winner.
			</p>
			<div class="mt-5 grid gap-3 sm:grid-cols-3">
				<div class="rounded-2xl border border-slate-700/70 bg-slate-950/60 px-4 py-3">
					<div class="text-xs uppercase tracking-[0.24em] text-slate-500">Submitted</div>
					<div class="mt-2 text-2xl font-semibold text-white">{submissions.length}</div>
				</div>
				<div class="rounded-2xl border border-slate-700/70 bg-slate-950/60 px-4 py-3">
					<div class="text-xs uppercase tracking-[0.24em] text-slate-500">Status</div>
					<div class="mt-2 text-sm font-medium text-amber-200">Awaiting judge pick</div>
				</div>
				<div class="rounded-2xl border border-slate-700/70 bg-slate-950/60 px-4 py-3">
					<div class="text-xs uppercase tracking-[0.24em] text-slate-500">Visibility</div>
					<div class="mt-2 text-sm font-medium text-slate-200">Anonymous until scoring</div>
				</div>
			</div>
		</div>
	</section>

	<section
		class="rounded-[28px] border border-slate-700/70 bg-slate-900/70 p-5 shadow-xl ring-1 ring-white/5 backdrop-blur-sm sm:p-6"
	>
		<div class="mb-4 flex items-center justify-between gap-3">
			<h3 class="text-lg font-semibold text-white">Anonymous submissions</h3>
			<div
				class="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400"
			>
				Live board
			</div>
		</div>
		<div class="grid gap-4 lg:grid-cols-2">
			{#each submissions as submission, index (index)}
				<article
					class="rounded-2xl border border-slate-700/70 bg-slate-950/65 p-4 shadow-inner shadow-black/20"
				>
					<div class="mb-3 flex items-center gap-3">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/15 text-sm font-bold text-amber-200 ring-1 ring-amber-400/20"
						>
							{index + 1}
						</div>
						<div>
							<div class="text-sm font-medium text-white">Submission #{index + 1}</div>
							<div class="text-xs text-slate-500">Player identity hidden</div>
						</div>
					</div>
					<div class="space-y-3">
						{#each submission.cards as card (card.id)}
							<div class="rounded-2xl bg-white p-4 text-left text-black shadow-sm">
								<p class="text-sm leading-relaxed">{card.text}</p>
							</div>
						{/each}
					</div>
				</article>
			{/each}
		</div>
	</section>
</div>
