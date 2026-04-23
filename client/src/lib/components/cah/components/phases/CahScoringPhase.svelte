<script lang="ts">
	import { onMount } from 'svelte';
	import type { CAHPlayer, CAHSubmission } from '$lib/types';

	interface Props {
		winnerPlayer: CAHPlayer | null;
		winnerSubmission: CAHSubmission | null;
	}

	let { winnerPlayer, winnerSubmission }: Props = $props();

	let countdown = $state(5);
	onMount(() => {
		const interval = setInterval(() => {
			countdown = Math.max(0, countdown - 1);
			if (countdown === 0) clearInterval(interval);
		}, 1000);
		return () => clearInterval(interval);
	});
</script>

<div class="space-y-4">
	{#if winnerPlayer}
		<!-- Winner announcement -->
		<div class="rounded-2xl border border-green-400/20 bg-green-500/[0.07] p-6 text-center">
			<p class="text-[11px] font-black uppercase tracking-[0.3em] text-green-400/60">Round winner</p>
			<div
				class="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-2xl font-black text-white"
			>
				{winnerPlayer.name.charAt(0).toUpperCase()}
			</div>
			<h2 class="mt-3 text-2xl font-black text-white">{winnerPlayer.name}</h2>
			<p class="mt-1 text-sm text-white/40">+1 point &nbsp;&middot;&nbsp; now has {winnerPlayer.score}</p>
		</div>

		<!-- Winning answer -->
		{#if winnerSubmission && winnerSubmission.cards.length > 0}
			<div>
				<p class="mb-2 text-[11px] font-black uppercase tracking-[0.3em] text-white/25">Winning answer</p>
				<div class="space-y-2">
					{#each winnerSubmission.cards as card (card.id)}
						<div class="rounded-xl border-l-2 border-green-400/60 bg-white p-4 shadow-md">
							<p class="text-sm font-bold leading-relaxed text-black">{card.text}</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	<!-- Next round countdown -->
	<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-4 text-center">
		<p class="text-sm font-bold text-white/40">Next round in {countdown}s…</p>
		<div class="mt-3 h-[3px] overflow-hidden rounded-full bg-white/10">
			<div
				class="h-[3px] rounded-full bg-white/20 transition-all duration-1000"
				style="width: {((5 - countdown) / 5) * 100}%"
			></div>
		</div>
	</div>
</div>
