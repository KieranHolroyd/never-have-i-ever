<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { colour_map } from '$lib/colour';
	import type { Player } from '$lib/types';

	interface Props {
		players: Player[];
	}

	let { players }: Props = $props();

	let expanded = $state(false);

	const voteDotClass: Record<string, string> = {
		Have: 'bg-emerald-400',
		Kinda: 'bg-sky-400',
		'Have Not': 'bg-rose-400'
	};
</script>

<div class="mx-auto mt-4 w-full max-w-lg">
	<button
		type="button"
		class="mb-2 flex w-full items-center justify-between rounded-xl border border-white/8 bg-zinc-900/60 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-white/50"
		onclick={() => (expanded = !expanded)}
	>
		<span>Players ({players.length})</span>
		<span class="text-white/30">{expanded ? 'Hide' : 'Show'}</span>
	</button>

	{#if expanded}
		<div class="space-y-2 rounded-2xl border border-white/8 bg-zinc-950/80 p-3">
			{#each players as player, index (player.id)}
				<div
					class={`relative flex items-center gap-3 rounded-xl px-3 py-2 font-semibold ${colour_map[player.this_round.vote ?? 'null']}`}
					in:fly={{ y: 6, duration: 220, delay: Math.min(index * 25, 300), easing: backOut }}
					animate:flip
					data-testid={`player-${player.name}`}
				>
					<span
						class={`h-2.5 w-2.5 shrink-0 rounded-full ${voteDotClass[player.this_round.vote ?? ''] ?? 'bg-zinc-500'}`}
					></span>
					<span class="min-w-0 flex-1 truncate text-sm">
						{player.name}
						<span class="text-white/50 font-normal">
							· {player.this_round.vote ?? 'Not voted'}
						</span>
					</span>
					<span
						class="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-black text-white"
						data-testid={`player-score-${player.name}`}
					>
						{player.score}
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
			{#each players as player, index (player.id)}
				<div
					class="relative flex shrink-0 flex-col items-center gap-1 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 min-w-[4.5rem]"
					in:fly={{ y: 4, duration: 180, delay: Math.min(index * 20, 200), easing: backOut }}
					animate:flip
					data-testid={`player-${player.name}`}
				>
					<span
						class={`absolute -top-0.5 -right-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white`}
						data-testid={`player-score-${player.name}`}
					>
						{player.score}
					</span>
					<span
						class={`h-2 w-2 rounded-full ${voteDotClass[player.this_round.vote ?? ''] ?? 'bg-zinc-600'}`}
					></span>
					<span class="max-w-[5rem] truncate text-xs font-bold text-white/90">{player.name}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
