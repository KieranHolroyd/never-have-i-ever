<script lang="ts">
	import { VoteOptions } from '$lib/types';
	import type { NhieRoundPhase } from '../types';
	import { Button } from '$lib/components/ui/button';
	import MdiCheck from '~icons/mdi/check';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import MdiSkipNext from '~icons/mdi/skip-next';

	interface Props {
		isVoteActive: (option: VoteOptions) => boolean;
		onVote: (option: VoteOptions) => void;
		canAdvanceRound: boolean;
		onAdvance: () => void;
		myVote?: string | null;
		roundPhase: NhieRoundPhase;
		hasMyVote: boolean;
		votedCount?: number;
		totalCount?: number;
		roundTimeout?: number;
	}

	let {
		isVoteActive,
		onVote,
		canAdvanceRound,
		onAdvance,
		myVote = null,
		roundPhase,
		hasMyVote,
		votedCount = 0,
		totalCount = 0,
		roundTimeout = 0
	}: Props = $props();

	const votes = [
		{
			option: VoteOptions.Have,
			label: 'Have',
			emoji: '🙋',
			active: 'border-emerald-600 bg-emerald-600 text-white'
		},
		{
			option: VoteOptions.Kinda,
			label: 'Kinda',
			emoji: '🤷',
			active: 'border-sky-600 bg-sky-600 text-white'
		},
		{
			option: VoteOptions.HaveNot,
			label: 'Have not',
			emoji: '🙅',
			active: 'border-rose-600 bg-rose-600 text-white'
		}
	];

	const statusLine = $derived.by(() => {
		if (roundPhase === 'results') {
			return roundTimeout > 0
				? `Everyone voted — next question in ${roundTimeout}s`
				: 'Everyone voted — tap Next question when ready';
		}
		if (roundPhase === 'waiting' && hasMyVote) {
			return `You voted ${myVote} — waiting for ${totalCount - votedCount} more`;
		}
		if (roundPhase === 'waiting' && !hasMyVote) {
			return 'Pick your answer before time runs out';
		}
		if (myVote) {
			return `You voted: ${myVote} — tap to change`;
		}
		return 'Pick your answer';
	});
</script>

<div class="fixed bottom-0 left-0 z-30 w-full">
	<div
		class="bg-background/95 border-t pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-md {roundPhase ===
		'results'
			? 'border-emerald-500/20'
			: ''}"
	>
		<div class="mx-auto max-w-4xl space-y-2.5 px-3 pt-3 sm:px-4">
			<p
				class="text-center text-[11px] font-medium tracking-widest uppercase lg:text-left {roundPhase ===
				'results'
					? 'text-emerald-600 dark:text-emerald-400'
					: ''}"
				aria-live="polite"
			>
				{#if roundPhase === 'results'}
					{statusLine}
				{:else if myVote}
					<span class="text-emerald-600 dark:text-emerald-400">{statusLine}</span>
				{:else}
					<span class="text-muted-foreground normal-case tracking-normal">{statusLine}</span>
				{/if}
			</p>

			<div class="flex flex-col gap-2 lg:flex-row lg:items-stretch">
				<div
					class="grid w-full grid-cols-3 gap-2 lg:flex-1 {roundPhase === 'answer' && !hasMyVote
						? 'ring-emerald-500/30 rounded-xl ring-2 ring-offset-2 ring-offset-background'
						: ''}"
					role="group"
					aria-label="Your vote"
				>
					{#each votes as { option, label, emoji, active: activeClass } (label)}
						{@const active = isVoteActive(option)}
						<Button
							type="button"
							variant="outline"
							aria-pressed={active}
							class="h-16 flex-col gap-0.5 rounded-xl text-sm font-semibold transition-colors {active
								? activeClass
								: ''}"
							data-testid={label === 'Have' ? 'have-button' : label === 'Have not' ? 'have-not-button' : undefined}
							onclick={() => onVote(option)}
						>
							{#if active}
								<MdiCheck class="size-5" />
							{:else}
								<span class="text-lg leading-none" aria-hidden="true">{emoji}</span>
							{/if}
							<span>{label}</span>
						</Button>
					{/each}
				</div>

				<Button
					variant={roundPhase === 'results' || (roundPhase === 'answer' && canAdvanceRound)
						? 'emerald'
						: 'secondary'}
					size="lg"
					class="h-11 w-full gap-2 lg:h-16 lg:w-56"
					onclick={onAdvance}
					disabled={!canAdvanceRound}
				>
					{#if roundPhase === 'results'}
						Next question
						{#if roundTimeout > 0}
							<span class="text-emerald-100/90 text-xs tabular-nums">({roundTimeout}s)</span>
						{/if}
						<MdiArrowRight class="size-4" />
					{:else if roundPhase === 'answer'}
						<MdiSkipNext class="size-4" />
						Skip question
					{:else if roundPhase === 'waiting'}
						{votedCount}/{totalCount} voted
					{:else}
						Waiting…
					{/if}
				</Button>
			</div>
		</div>
	</div>
</div>
