<script lang="ts">
	import { VoteOptions, type Player } from '$lib/types';
	import NhieQuestionCard from '../game/NhieQuestionCard.svelte';
	import NhieRoundProgress from '../game/NhieRoundProgress.svelte';
	import NhiePlayerStrip from '../game/NhiePlayerStrip.svelte';
	import NhieVoteBar from '../game/NhieVoteBar.svelte';

	interface Props {
		currentQuestion: { content: string; catagory: string } | null;
		connectedPlayers: Player[];
		waitingForPlayers: boolean;
		votedPlayerCount: number;
		connectedPlayerCount: number;
		roundTimeout: number;
		timeoutStart: number;
		canAdvanceRound: boolean;
		allConnectedPlayersVoted: boolean;
		error: string | null;
		isVoteActive: (option: VoteOptions) => boolean;
		onVote: (option: VoteOptions) => void;
		onAdvance: () => void;
	}

	let {
		currentQuestion,
		connectedPlayers,
		waitingForPlayers,
		votedPlayerCount,
		connectedPlayerCount,
		roundTimeout,
		timeoutStart,
		canAdvanceRound,
		allConnectedPlayersVoted,
		error,
		isVoteActive,
		onVote,
		onAdvance
	}: Props = $props();
</script>

<div class="mx-auto mt-4 w-full max-w-lg" data-testid="nhie-play">
	{#if currentQuestion?.content}
		<NhieQuestionCard category={currentQuestion.catagory} content={currentQuestion.content} />

		<NhieRoundProgress
			votedCount={votedPlayerCount}
			totalCount={connectedPlayerCount}
			{waitingForPlayers}
			{roundTimeout}
			timerStarted={timeoutStart > 0}
		/>

		<NhiePlayerStrip players={connectedPlayers} />

		{#if error}
			<p class="mt-3 text-center text-sm text-rose-400">{error}</p>
		{/if}

		<NhieVoteBar
			{isVoteActive}
			{onVote}
			{canAdvanceRound}
			{waitingForPlayers}
			{allConnectedPlayersVoted}
			{onAdvance}
		/>
	{:else}
		<div class="nhie-hero-card py-12">
			<p class="text-lg font-bold text-white/60">Waiting for the next question…</p>
		</div>
	{/if}
</div>
