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
			shortLabel: 'Have',
			emoji: '🙋',
			active: 'border-emerald-600 bg-emerald-600 text-white'
		},
		{
			option: VoteOptions.Kinda,
			label: 'Kinda',
			shortLabel: 'Kinda',
			emoji: '🤷',
			active: 'border-sky-600 bg-sky-600 text-white'
		},
		{
			option: VoteOptions.HaveNot,
			label: 'Have not',
			shortLabel: 'Nope',
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

<div class="fixed inset-x-0 bottom-0 z-30 w-full max-w-[100vw]">
	<div
		class="bg-background/95 border-t pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur-md {roundPhase ===
		'results'
			? 'border-emerald-500/20'
			: ''}"
	>
		<div class="mx-auto max-w-4xl space-y-2 px-3 pt-2 sm:space-y-2.5 sm:px-4 sm:pt-3">
			<p
				class="text-center text-[10px] font-medium tracking-wide uppercase sm:text-[11px] sm:tracking-widest lg:text-left {roundPhase ===
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

			<div class="flex flex-col gap-1.5 sm:gap-2 lg:flex-row lg:items-stretch">
				<div
					class="grid w-full min-w-0 grid-cols-3 gap-1.5 sm:gap-2 lg:flex-1 {roundPhase === 'answer' &&
					!hasMyVote
						? 'ring-emerald-500/30 rounded-xl ring-2 ring-offset-1 ring-offset-background sm:ring-offset-2'
						: ''}"
					role="group"
					aria-label="Your vote"
				>
					{#each votes as { option, label, shortLabel, emoji, active: activeClass } (label)}
						{@const active = isVoteActive(option)}
						<Button
							type="button"
							variant="outline"
							aria-pressed={active}
							aria-label={label}
							class="touch-manipulation h-14 flex-col gap-0 rounded-xl px-1 text-xs font-semibold sm:h-16 sm:px-2 sm:text-sm {active
								? activeClass
								: ''}"
							data-testid={label === 'Have' ? 'have-button' : label === 'Have not' ? 'have-not-button' : undefined}
							onclick={() => onVote(option)}
						>
							{#if active}
								<MdiCheck class="size-4 sm:size-5" />
							{:else}
								<span class="text-base leading-none sm:text-lg" aria-hidden="true">{emoji}</span>
							{/if}
							<span class="max-w-full truncate">
								<span class="sm:hidden">{shortLabel}</span>
								<span class="hidden sm:inline">{label}</span>
							</span>
						</Button>
					{/each}
				</div>

				<Button
					variant={roundPhase === 'results' || (roundPhase === 'answer' && canAdvanceRound)
						? 'emerald'
						: 'secondary'}
					size="lg"
					class="touch-manipulation h-10 w-full shrink-0 gap-2 text-sm sm:h-11 lg:h-16 lg:w-56 lg:text-base"
					onclick={onAdvance}
					disabled={!canAdvanceRound}
				>
					{#if roundPhase === 'results'}
						<span class="truncate">Next question</span>
						{#if roundTimeout > 0}
							<span class="text-emerald-100/90 shrink-0 text-xs tabular-nums">({roundTimeout}s)</span>
						{/if}
						<MdiArrowRight class="size-4 shrink-0" />
					{:else if roundPhase === 'answer'}
						<MdiSkipNext class="size-4 shrink-0" />
						<span class="truncate">Skip question</span>
					{:else if roundPhase === 'waiting'}
						<span class="tabular-nums">{votedCount}/{totalCount} voted</span>
					{:else}
						Waiting…
					{/if}
				</Button>
			</div>
		</div>
	</div>
</div>
