<script lang="ts">
	import { colour_map } from '$lib/colour';
	import type { GameRound } from '$lib/types';

	export let history: GameRound[];
</script>

{#each history as round, idx}
	<div
		class="relative prose dark:prose-invert bg-gray-800 shadow-md rounded-lg mx-auto my-6 max-w-lg pt-8 pb-2 px-2"
	>
		<span class="absolute left-2 top-2 uppercase text-xs">
			<b>Round</b>
			{idx + 1}
		</span>
		<span class="absolute right-2 top-2 uppercase text-xs"
			><b>Catagory</b>: {round.question.catagory}</span
		>
		<p class="mb-2 mt-0">{round.question.content}</p>
		{#each round.players.filter((p) => p.connected) as player}
			<div class={`relative my-1 p-1 font-bold text ${colour_map[player.this_round.vote]}`}>
				{player.name}: {player.this_round.vote ?? 'Not Voted'}
				<div
					class="absolute text-xs leading-[1.825] top-1 right-8 bg-green-600 border border-white rounded-full text-white min-w-[1.5rem] h-6 px-1"
				>
					Up {player.this_round.vote === 'Have'
						? '+1'
						: player.this_round.vote === 'Have Not'
						? '0'
						: player.this_round.vote === 'Kinda'
						? '+0.5'
						: 'N/A'} Points
				</div>
				<div
					class="absolute text-xs leading-[1.825] top-1 right-1 bg-red-600 border border-white rounded-full text-white min-w-[1.5rem] h-6 px-1"
				>
					{player.score}
				</div>
			</div>
		{/each}
	</div>
{/each}
