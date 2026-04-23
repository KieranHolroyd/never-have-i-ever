<script lang="ts">
	import type { CAHGameState } from "$lib/types";

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();

	const nonJudges = $derived(gameState.players.filter((p) => p.connected && !p.isJudge));
	const submittedCount = $derived(gameState.submittedCards?.length ?? 0);
	const totalNeeded = $derived(nonJudges.length);
	const allSubmitted = $derived(submittedCount >= totalNeeded && totalNeeded > 0);
	const submittedPlayerIds = $derived(new Set((gameState.submittedCards ?? []).map((s) => s.playerId)));
</script>

<div class="space-y-4">
	<!-- Judge banner -->
	<div class="rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] p-5">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-[11px] font-black uppercase tracking-[0.3em] text-amber-400/60">You are the judge</p>
				<h3 class="mt-1 text-xl font-black text-white">
					{allSubmitted ? "All cards are in — get ready!" : "Waiting for submissions"}
				</h3>
				<p class="mt-1 text-sm text-white/40">
					{allSubmitted
						? "All players have played their cards. Phase will switch to judging shortly."
						: `${totalNeeded - submittedCount} player${totalNeeded - submittedCount === 1 ? "" : "s"} still choosing…`}
				</p>
			</div>
			<div
				class="shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold
				{allSubmitted ? 'border-green-400/20 bg-green-500/[0.08] text-green-400/80' : 'border-amber-400/20 bg-amber-500/[0.08] text-amber-300/80'}"
			>
				{submittedCount}/{totalNeeded}
			</div>
		</div>
		<!-- Progress bar -->
		<div class="mt-4 h-[3px] overflow-hidden rounded-full bg-white/10">
			<div
				class="h-[3px] rounded-full transition-all duration-500 {allSubmitted ? 'bg-green-400' : 'bg-amber-400'}"
				style="width: {totalNeeded > 0 ? Math.round((submittedCount / totalNeeded) * 100) : 0}%"
			></div>
		</div>
	</div>

	<!-- Player submission grid -->
	<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
		{#each nonJudges as player (player.id)}
			{@const hasSubmitted = submittedPlayerIds.has(player.id)}
			<div
				class="flex items-center gap-2.5 rounded-xl border p-3 transition-colors
				{hasSubmitted ? 'border-green-400/20 bg-green-500/[0.06]' : 'border-white/[0.05] bg-white/[0.02]'}"
			>
				<div
					class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black
					{hasSubmitted ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'}"
				>
					{#if hasSubmitted}✓{:else}…{/if}
				</div>
				<div class="min-w-0">
					<p class="truncate text-sm font-bold {hasSubmitted ? 'text-white/80' : 'text-white/40'}">
						{player.name}
					</p>
					<p class="text-[11px] {hasSubmitted ? 'text-green-400/70' : 'text-white/25'}">
						{hasSubmitted ? "submitted" : "choosing…"}
					</p>
				</div>
			</div>
		{/each}
	</div>
</div>
