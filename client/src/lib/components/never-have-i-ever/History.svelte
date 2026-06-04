<script lang="ts">
	import { colour_map } from '$lib/colour';
	import type { GameRound } from '$lib/types';

	interface Props {
		history: GameRound[];
	}

	let { history }: Props = $props();
</script>

{#if history.length > 0}
	<section class="mt-8 text-left">
		<h2 class="nhie-phase-label mb-4 text-center">Round history</h2>
		{#each history as round, idx (idx)}
			<div class="relative mx-auto my-4 max-w-lg rounded-2xl border border-white/8 bg-zinc-950 pt-8 pb-3 px-4">
				<span class="absolute left-3 top-3 text-[10px] font-black uppercase tracking-wider text-white/35">
					Round {idx + 1}
				</span>
				<span class="absolute right-3 top-3 text-[10px] font-black uppercase tracking-wider text-emerald-400/70">
					{round.question.catagory}
				</span>
				<p class="mb-3 mt-2 text-base font-semibold leading-snug text-zinc-100">{round.question.content}</p>
				{#each round.players.filter((p) => p.connected) as player (player.id)}
					<div
						class={`relative my-1 rounded-lg px-2 py-1.5 text-sm font-bold ${colour_map[player.this_round.vote ?? 'null']}`}
					>
						{player.name}: {player.this_round.vote ?? 'Not Voted'}
						<div
							class="absolute top-1 right-1 rounded-full border border-white/20 bg-rose-600 px-1.5 text-xs text-white"
						>
							{player.score}
						</div>
					</div>
				{/each}
			</div>
		{/each}
	</section>
{/if}
