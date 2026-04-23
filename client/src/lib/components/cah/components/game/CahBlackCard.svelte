<script lang="ts">
	import type { CAHGameState } from '$lib/types';
	import { fade } from 'svelte/transition';

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();
</script>

{#if gameState.currentBlackCard}
	<div in:fade={{ duration: 150 }} class="flex gap-5 items-start">
		<!-- Physical black card -->
		<div
			class="relative flex min-h-[13rem] w-full max-w-sm shrink-0 flex-col justify-between rounded-2xl bg-black p-6 shadow-[0_8px_40px_rgba(0,0,0,0.7)] sm:min-h-[15rem] sm:p-8"
		>
			{#if gameState.currentBlackCard.pick > 1}
				<div
					class="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white"
				>
					Pick {gameState.currentBlackCard.pick}
				</div>
			{/if}

			<p class="pr-14 text-xl font-black leading-snug text-white sm:text-2xl">
				{gameState.currentBlackCard.text}
			</p>

			<div class="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
				<span class="text-[10px] font-black uppercase tracking-[0.3em] text-white/30"
					>Cards Against Humanity</span
				>
				<span class="text-xs font-bold text-white/25"
					>{gameState.currentRound}/{gameState.maxRounds}</span
				>
			</div>
		</div>

		<!-- Instruction callout -->
		<div class="hidden flex-1 sm:block">
			<p class="text-[11px] font-black uppercase tracking-[0.3em] text-white/25 mb-3">
				How to play this round
			</p>
			<p class="text-sm text-white/50 leading-relaxed">
				{#if gameState.currentBlackCard.pick > 1}
					Choose <strong class="text-white/80">{gameState.currentBlackCard.pick} white cards</strong
					> in order. The judge will see all submissions anonymously.
				{:else}
					Choose your <strong class="text-white/80">single best white card</strong> to complete the prompt.
					The judge picks the funniest answer.
				{/if}
			</p>
		</div>
	</div>
{/if}
