<script lang="ts">
	import { VoteOptions } from '$lib/types';

	interface Props {
		isVoteActive: (option: VoteOptions) => boolean;
		onVote: (option: VoteOptions) => void;
		canAdvanceRound: boolean;
		waitingForPlayers: boolean;
		allConnectedPlayersVoted: boolean;
		onAdvance: () => void;
	}

	let {
		isVoteActive,
		onVote,
		canAdvanceRound,
		waitingForPlayers,
		allConnectedPlayersVoted,
		onAdvance
	}: Props = $props();
</script>

<div class="fixed bottom-0 left-0 z-30 w-full">
	<div
		class="grid grid-cols-3 border-t border-zinc-700/60 bg-zinc-950/95 backdrop-blur-md"
	>
		<button
			type="button"
			class={`col-span-1 py-4 text-xl font-black transition-all duration-200 sm:text-2xl ${isVoteActive(VoteOptions.Have)
				? 'nhie-vote-have'
				: 'text-white hover:bg-emerald-500/20 hover:text-emerald-300'}`}
			onclick={() => onVote(VoteOptions.Have)}
			aria-pressed={isVoteActive(VoteOptions.Have)}
			data-testid="have-button"
		>
			Have
		</button>
		<button
			type="button"
			class={`col-span-1 border-x border-zinc-700/60 py-4 text-xl font-black transition-all duration-200 sm:text-2xl ${isVoteActive(VoteOptions.Kinda)
				? 'nhie-vote-kinda'
				: 'text-white hover:bg-sky-500/20 hover:text-sky-300'}`}
			onclick={() => onVote(VoteOptions.Kinda)}
			aria-pressed={isVoteActive(VoteOptions.Kinda)}
		>
			Kinda
		</button>
		<button
			type="button"
			class={`col-span-1 py-4 text-xl font-black transition-all duration-200 sm:text-2xl ${isVoteActive(VoteOptions.HaveNot)
				? 'nhie-vote-not'
				: 'text-white hover:bg-rose-500/20 hover:text-rose-300'}`}
			onclick={() => onVote(VoteOptions.HaveNot)}
			aria-pressed={isVoteActive(VoteOptions.HaveNot)}
			data-testid="have-not-button"
		>
			Have not
		</button>
	</div>
	<div
		class="border-t border-zinc-800 bg-zinc-950/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-md"
	>
		<button
			type="button"
			class="w-full rounded-xl bg-emerald-600 py-3.5 text-lg font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
			onclick={onAdvance}
			disabled={!canAdvanceRound}
		>
			{#if waitingForPlayers}
				{#if allConnectedPlayersVoted}
					Skip round
				{:else}
					Waiting for votes…
				{/if}
			{:else}
				Next question
			{/if}
		</button>
	</div>
</div>
