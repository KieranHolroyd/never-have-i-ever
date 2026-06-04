<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import type { Player } from '$lib/types';
	import History from '../History.svelte';
	import type { GameRound } from '$lib/types';

	interface Props {
		players: Player[];
		history: GameRound[];
		onReset: () => void;
	}

	let { players, history, onReset }: Props = $props();

	const ranked = $derived(
		[...players].sort((a, b) => b.score - a.score)
	);

	function podiumClass(rank: number) {
		if (rank === 0) return 'nhie-podium-gold';
		if (rank === 1) return 'nhie-podium-silver';
		if (rank === 2) return 'nhie-podium-bronze';
		return 'border-white/8 bg-zinc-950';
	}

	function rankLabel(rank: number) {
		if (rank === 0) return '🥇';
		if (rank === 1) return '🥈';
		if (rank === 2) return '🥉';
		return `#${rank + 1}`;
	}
</script>

<div class="mx-auto mt-6 w-full max-w-lg text-center" data-testid="nhie-game-over" in:fade={{ duration: 300 }}>
	<div class="relative overflow-hidden rounded-3xl border border-fuchsia-500/20 bg-zinc-950 px-4 py-8">
		<div
			class="pointer-events-none absolute inset-0 opacity-30"
			aria-hidden="true"
		>
			{#each Array.from({ length: 12 }) as _, i (i)}
				<span
					class="absolute h-2 w-2 rounded-full bg-fuchsia-400/60"
					style="left: {(i * 17) % 100}%; top: {(i * 23) % 80}%; animation: nhie-confetti {1.2 + (i % 3) * 0.3}s ease-in-out infinite"
				></span>
			{/each}
		</div>
		<p class="nhie-phase-label text-fuchsia-300/80">Game over</p>
		<h1 class="mt-2 text-3xl font-black text-white">Final scores</h1>
		<p class="mt-2 text-sm text-white/45">Thanks for playing — rematch?</p>
	</div>

	<ul class="mt-6 space-y-3">
		{#each ranked as player, index (player.id)}
			<li
				class={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${podiumClass(index)}`}
				in:fly={{ y: 10, duration: 280, delay: index * 60, easing: backOut }}
			>
				<span class="text-2xl">{rankLabel(index)}</span>
				<span class="min-w-0 flex-1 truncate text-left text-lg font-black text-white">{player.name}</span>
				<span class="rounded-full bg-rose-600 px-3 py-1 text-sm font-black text-white">
					{player.score} pts
				</span>
			</li>
		{/each}
	</ul>

	<History {history} />

	<button
		type="button"
		class="mt-8 w-full rounded-xl bg-emerald-500 py-4 text-lg font-black text-zinc-950 transition hover:bg-emerald-400"
		onclick={onReset}
	>
		Play again
	</button>
</div>

<style>
	@keyframes nhie-confetti {
		0%,
		100% {
			transform: translateY(0) scale(1);
			opacity: 0.4;
		}
		50% {
			transform: translateY(-12px) scale(1.2);
			opacity: 0.9;
		}
	}
</style>
