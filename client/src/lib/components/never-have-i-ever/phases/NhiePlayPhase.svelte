<script lang="ts">
	import { VoteOptions, type Player } from '$lib/types';
	import NhieQuestionCard from '../game/NhieQuestionCard.svelte';
	import NhieVoteTally from '../game/NhieVoteTally.svelte';
	import NhiePlayerStrip from '../game/NhiePlayerStrip.svelte';
	import NhieVoteBar from '../game/NhieVoteBar.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		Empty,
		EmptyDescription,
		EmptyHeader,
		EmptyMedia,
		EmptyTitle
	} from '$lib/components/ui/empty';

	import type { NhieRoundPhase } from '../types';

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
		roundPhase: NhieRoundPhase;
		hasMyVote: boolean;
		revealVotes: boolean;
		error: string | null;
		isVoteActive: (option: VoteOptions) => boolean;
		onVote: (option: VoteOptions) => void;
		onAdvance: () => void;
		roundNumber?: number;
		myVote?: string | null;
		currentPlayerId?: string | null;
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
		roundPhase,
		hasMyVote,
		revealVotes,
		error,
		isVoteActive,
		onVote,
		onAdvance,
		roundNumber = 1,
		myVote = null,
		currentPlayerId = null
	}: Props = $props();
</script>

<div class="pt-4" data-testid="nhie-play">
	{#if currentQuestion?.content}
		<div class="grid gap-4 lg:grid-cols-3 lg:items-start">
			<div class="space-y-4 lg:col-span-2">
				<NhieQuestionCard
					category={currentQuestion.catagory}
					content={currentQuestion.content}
					{roundNumber}
					votedCount={votedPlayerCount}
					totalCount={connectedPlayerCount}
					{waitingForPlayers}
					{roundTimeout}
					timerStarted={timeoutStart > 0}
					{roundPhase}
					{hasMyVote}
				/>

				{#if error}
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				{/if}
			</div>

			<div class="space-y-4">
				{#if revealVotes}
					<NhieVoteTally players={connectedPlayers} />
				{/if}

				<NhiePlayerStrip
					players={connectedPlayers}
					{currentPlayerId}
					{revealVotes}
					{roundPhase}
				/>
			</div>
		</div>

		<NhieVoteBar
			{isVoteActive}
			{onVote}
			{canAdvanceRound}
			{onAdvance}
			{myVote}
			{roundPhase}
			{hasMyVote}
			votedCount={votedPlayerCount}
			totalCount={connectedPlayerCount}
			{roundTimeout}
		/>
	{:else}
		<Empty class="border py-16">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<span class="animate-pulse">🃏</span>
				</EmptyMedia>
				<EmptyTitle>Waiting for the next question</EmptyTitle>
				<EmptyDescription>Hang tight — the next round is on its way.</EmptyDescription>
			</EmptyHeader>
		</Empty>
	{/if}
</div>
