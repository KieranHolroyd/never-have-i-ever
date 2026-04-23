<script lang="ts">
	import type { CAHSubmission } from '$lib/types';

	interface Props {
		submissions: CAHSubmission[];
		onSelectWinner: (playerId: string) => void;
	}

	let { submissions, onSelectWinner }: Props = $props();
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<p class="text-[11px] font-black uppercase tracking-[0.3em] text-white/30">Judge panel</p>
			<h3 class="mt-1 text-xl font-black text-white">Pick the winner</h3>
			<p class="mt-1 text-sm text-white/40">
				Tap the funniest anonymous submission to award the point.
			</p>
		</div>
		<div
			class="shrink-0 rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-3 py-1.5 text-sm font-bold text-amber-300/80"
		>
			{submissions.length} submitted
		</div>
	</div>

	<!-- Submission cards -->
	<div class="grid gap-4 sm:grid-cols-2">
		{#each submissions as submission, index (submission.playerId)}
			<button
				class="group rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-400/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
				onclick={() => onSelectWinner(submission.playerId)}
			>
				<!-- Submission header -->
				<div class="mb-4 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-sm font-black text-amber-300"
						>
							{index + 1}
						</div>
						<span class="text-xs font-black uppercase tracking-[0.25em] text-white/30"
							>Anonymous</span
						>
					</div>
					<span
						class="rounded-full border border-amber-400/20 bg-amber-500/[0.08] px-2.5 py-1 text-[11px] font-bold text-amber-300/60 transition-colors group-hover:text-amber-300"
					>
						Award point →
					</span>
				</div>

				<!-- White card(s) -->
				<div class="space-y-2">
					{#each submission.cards as card (card.id)}
						<div
							class="rounded-xl bg-white p-4 shadow-sm transition-transform duration-150 group-hover:-translate-y-0.5"
						>
							<p class="text-sm font-bold leading-relaxed text-black">{card.text}</p>
						</div>
					{/each}
				</div>
			</button>
		{/each}
	</div>
</div>
