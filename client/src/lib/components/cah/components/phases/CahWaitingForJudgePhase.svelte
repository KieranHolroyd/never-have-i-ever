<script lang="ts">
	import type { CAHSubmission } from '$lib/types';

	interface Props {
		submissions: CAHSubmission[];
	}

	let { submissions }: Props = $props();
</script>

<div class="space-y-4">
	<!-- Status banner -->
	<div class="rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] p-5 text-center">
<p class="text-[11px] font-black uppercase tracking-[0.3em] text-amber-400/60">Judging</p>
		<h2 class="mt-1 text-xl font-black text-white">Judge is deciding</h2>
		<p class="mt-1 text-sm text-white/40">
			All {submissions.length} submission{submissions.length === 1 ? '' : 's'} are in — waiting for the judge's pick.
		</p>
	</div>

	<!-- Submissions view -->
	<div class="grid gap-3 sm:grid-cols-2">
		{#each submissions as submission, index (index)}
			<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-4">
				<div class="mb-3 flex items-center gap-2.5">
					<div class="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-xs font-black text-amber-300">
						{index + 1}
					</div>
					<span class="text-[11px] font-black uppercase tracking-[0.25em] text-white/30">Anonymous</span>
				</div>
				<div class="space-y-2">
					{#each submission.cards as card (card.id)}
						<div class="rounded-xl bg-white p-3.5">
							<p class="text-sm font-bold leading-relaxed text-black">{card.text}</p>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
