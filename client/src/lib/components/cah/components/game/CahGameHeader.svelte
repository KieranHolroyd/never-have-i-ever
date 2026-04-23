<script lang="ts">
	import type { CAHGameState } from '$lib/types';

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();

	const pct = $derived(Math.round((gameState.currentRound / gameState.maxRounds) * 100));
	const activePlayers = $derived(gameState.players.filter((p) => p.connected).length);
</script>

<div class="flex items-center gap-4">
	<!-- Round counter -->
	<div class="flex items-baseline gap-1.5 shrink-0">
		<span class="text-4xl font-black text-white leading-none">{gameState.currentRound}</span>
		<span class="text-sm font-bold text-white/25">/ {gameState.maxRounds}</span>
	</div>

	<!-- Progress bar -->
	<div class="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
		<div
			class="h-[3px] bg-white rounded-full transition-all duration-500"
			style="width: {pct}%"
		></div>
	</div>

	<!-- Active players -->
	<div class="shrink-0 flex items-center gap-1.5">
		<div class="flex -space-x-1.5">
			{#each gameState.players.filter((p) => p.connected).slice(0, 4) as player (player.id)}
				<div
					class="h-6 w-6 rounded-full border border-[#111111] bg-white/15 flex items-center justify-center text-[10px] font-black text-white"
				>
					{player.name.charAt(0).toUpperCase()}
				</div>
			{/each}
			{#if activePlayers > 4}
				<div
					class="h-6 w-6 rounded-full border border-[#111111] bg-white/10 flex items-center justify-center text-[10px] font-black text-white/50"
				>
					+{activePlayers - 4}
				</div>
			{/if}
		</div>
		<span class="text-xs text-white/30 font-bold">{activePlayers} playing</span>
	</div>
</div>
