<script lang="ts">
	import type { CAHGameState } from '$lib/types';
	import CahBadge from '../shared/CahBadge.svelte';
	import { fade, scale } from 'svelte/transition';

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();
</script>

{#if gameState.currentBlackCard}
	<section
		class="rounded-[28px] border border-slate-700/70 bg-slate-950/90 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/5 sm:p-6"
		in:fade={{ duration: 150 }}
	>
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<p class="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Prompt</p>
				<h3 class="mt-2 text-lg font-semibold text-white">Black Card</h3>
				<p class="mt-1 text-sm text-slate-400">Read this first, then build the funniest answer.</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<CahBadge variant="info" size="sm" showIcon={true}>Judge picks winner</CahBadge>
				{#if gameState.currentBlackCard.pick > 1}
					<CahBadge variant="info" size="sm" showIcon={true}>
						Pick {gameState.currentBlackCard.pick}
					</CahBadge>
				{/if}
			</div>
		</div>

		<div
			class="mt-5 rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.45),rgba(2,6,23,0.98))] p-6 text-center sm:p-8"
			in:scale={{ start: 0.98, duration: 150 }}
		>
			<div
				class="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-inner shadow-black/50"
			>
				<span class="text-xs font-bold uppercase tracking-[0.3em] text-slate-300">Q</span>
			</div>
			<p
				class="mx-auto max-w-3xl text-[1.3rem] font-medium leading-relaxed text-white sm:text-[1.65rem]"
			>
				{gameState.currentBlackCard.text}
			</p>
			<div
				class="mt-5 flex flex-wrap items-center justify-center gap-3 border-t border-white/10 pt-5 text-sm text-slate-300"
			>
				<div class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
					Round {gameState.currentRound} of {gameState.maxRounds}
				</div>
				<div class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
					{gameState.currentBlackCard.pick > 1
						? `Select exactly ${gameState.currentBlackCard.pick} white cards`
						: 'Select your single best white card'}
				</div>
			</div>
		</div>
	</section>
{/if}
