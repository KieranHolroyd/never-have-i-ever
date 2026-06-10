<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import type { CAHPlayer } from '$lib/types';

	interface Props {
		players: CAHPlayer[];
		currentPlayerId?: string | null;
		judgeId?: string | null;
	}

	let { players, currentPlayerId = null, judgeId = null }: Props = $props();

	let expanded = $state(false);

	const connected = $derived(players.filter((p) => p.connected));
</script>

<div class="mx-auto mt-4 w-full max-w-lg lg:hidden">
	<button
		type="button"
		class="mb-2 flex w-full items-center justify-between rounded-xl border border-white/8 bg-zinc-900/60 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-white/50"
		onclick={() => (expanded = !expanded)}
	>
		<span>Table ({connected.length})</span>
		<span class="text-white/30">{expanded ? 'Hide' : 'Show'}</span>
	</button>

	{#if expanded}
		<div class="bg-card space-y-2 rounded-xl border p-3">
			{#each connected as player, index (player.id)}
				<div
					class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-white/80"
					in:fly={{ y: 4, duration: 180, delay: Math.min(index * 20, 200), easing: backOut }}
					animate:flip
				>
					<span
						class={`h-2 w-2 rounded-full ${player.id === currentPlayerId ? 'bg-violet-400' : 'bg-white/20'}`}
					></span>
					<span class="min-w-0 flex-1 truncate">{player.name}</span>
					{#if player.id === judgeId}
						<span class="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-violet-300"
							>Judge</span
						>
					{/if}
					<span class="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-black text-white"
						>{player.score}</span
					>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex gap-2 overflow-x-auto pb-1">
			{#each connected as player, index (player.id)}
				<div
					class="relative flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2"
					animate:flip
				>
					<span
						class="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-black text-white"
					>
						{player.score}
					</span>
					<span
						class={`h-2 w-2 rounded-full ${player.id === judgeId ? 'bg-amber-400' : player.id === currentPlayerId ? 'bg-violet-400' : 'bg-white/20'}`}
					></span>
					<span class="max-w-[5rem] truncate text-xs font-bold">{player.name}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
