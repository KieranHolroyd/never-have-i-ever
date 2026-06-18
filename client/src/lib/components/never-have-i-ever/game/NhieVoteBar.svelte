<script lang="ts">
	import { onMount } from 'svelte';
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

	let barEl: HTMLDivElement | undefined = $state();

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
				? `Next question in ${roundTimeout}s`
				: 'Tap next when ready';
		}
		if (roundPhase === 'waiting' && hasMyVote) {
			return `Waiting for ${totalCount - votedCount} more`;
		}
		if (roundPhase === 'waiting' && !hasMyVote) {
			return 'Pick your answer';
		}
		if (myVote) {
			return `You: ${myVote}`;
		}
		return 'Pick your answer';
	});

	const advanceLabel = $derived.by(() => {
		if (roundPhase === 'results') return 'Next question';
		if (roundPhase === 'answer') return 'Skip question';
		if (roundPhase === 'waiting') return `${votedCount}/${totalCount} voted`;
		return 'Waiting';
	});

	const advanceVariant = $derived(
		roundPhase === 'results' || (roundPhase === 'answer' && canAdvanceRound) ? 'emerald' : 'secondary'
	);

	onMount(() => {
		if (!barEl) return;

		const syncHeight = () => {
			document.documentElement.style.setProperty('--nhie-vote-bar-height', `${barEl!.offsetHeight}px`);
		};

		syncHeight();
		const observer = new ResizeObserver(syncHeight);
		observer.observe(barEl);

		return () => {
			observer.disconnect();
		};
	});
</script>

{#snippet voteButtons(compact: boolean)}
	{#each votes as { option, label, shortLabel, emoji, active: activeClass } (label)}
		{@const active = isVoteActive(option)}
		<Button
			type="button"
			variant="outline"
			aria-pressed={active}
			aria-label={label}
			class="touch-manipulation min-w-0 flex-col gap-0 rounded-xl font-semibold {compact
				? 'h-12 px-0.5 text-[11px] sm:h-14 sm:px-1 sm:text-xs'
				: 'h-16 px-2 text-sm'} {active ? activeClass : ''}"
			data-testid={label === 'Have' ? 'have-button' : label === 'Have not' ? 'have-not-button' : undefined}
			onclick={() => onVote(option)}
		>
			{#if active}
				<MdiCheck class="size-4 sm:size-5" />
			{:else}
				<span class="text-base leading-none sm:text-lg" aria-hidden="true">{emoji}</span>
			{/if}
			<span class="max-w-full truncate">
				{#if compact}
					{shortLabel}
				{:else}
					{label}
				{/if}
			</span>
		</Button>
	{/each}
{/snippet}

{#snippet advanceButton(compact: boolean)}
	<Button
		variant={advanceVariant}
		size="lg"
		class="touch-manipulation shrink-0 {compact
			? 'h-12 w-12 flex-col gap-0 rounded-xl px-0 text-[10px] sm:h-14 sm:w-14'
			: 'h-11 w-full gap-2 text-sm lg:h-16 lg:w-56 lg:text-base'}"
		title={advanceLabel}
		aria-label={advanceLabel}
		onclick={onAdvance}
		disabled={!canAdvanceRound}
	>
		{#if roundPhase === 'results'}
			{#if compact}
				<MdiArrowRight class="size-5" />
			{:else}
				<span class="truncate">Next question</span>
				{#if roundTimeout > 0}
					<span class="text-emerald-100/90 shrink-0 text-xs tabular-nums">({roundTimeout}s)</span>
				{/if}
				<MdiArrowRight class="size-4 shrink-0" />
			{/if}
		{:else if roundPhase === 'answer'}
			{#if compact}
				<MdiSkipNext class="size-5" />
			{:else}
				<MdiSkipNext class="size-4 shrink-0" />
				<span class="truncate">Skip question</span>
			{/if}
		{:else if roundPhase === 'waiting'}
			<span class="text-[10px] leading-none font-semibold tabular-nums lg:text-base">
				{compact ? `${votedCount}/${totalCount}` : `${votedCount}/${totalCount} voted`}
			</span>
		{:else}
			<span class="text-[10px] lg:text-base">…</span>
		{/if}
	</Button>
{/snippet}

<div bind:this={barEl} class="fixed inset-x-0 bottom-0 z-30 w-full max-w-[100vw]">
	<div
		class="bg-background/95 border-t pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md {roundPhase ===
		'results'
			? 'border-emerald-500/20'
			: ''}"
	>
		<div class="mx-auto max-w-4xl px-3 pt-2 sm:px-4 sm:pt-3">
			<p
				class="mb-1.5 text-center text-[10px] font-medium tracking-wide uppercase sm:mb-2 sm:text-[11px] sm:tracking-widest lg:text-left {roundPhase ===
				'results'
					? 'text-emerald-600 dark:text-emerald-400'
					: myVote
						? 'text-emerald-600 dark:text-emerald-400'
						: 'text-muted-foreground normal-case tracking-normal'}"
				aria-live="polite"
			>
				{statusLine}
			</p>

			<!-- Mobile: single-row controls -->
			<div
				class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-stretch gap-1.5 sm:gap-2 lg:hidden {roundPhase ===
					'answer' && !hasMyVote
					? 'rounded-xl ring-2 ring-emerald-500/30 ring-offset-1 ring-offset-background'
					: ''}"
				role="group"
				aria-label="Your vote"
			>
				{@render voteButtons(true)}
				{@render advanceButton(true)}
			</div>

			<!-- Desktop: stacked action row -->
			<div class="hidden flex-col gap-2 lg:flex lg:flex-row lg:items-stretch">
				<div
					class="grid w-full grid-cols-3 gap-2 lg:flex-1 {roundPhase === 'answer' && !hasMyVote
						? 'rounded-xl ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-background'
						: ''}"
					role="group"
					aria-label="Your vote"
				>
					{@render voteButtons(false)}
				</div>
				{@render advanceButton(false)}
			</div>
		</div>
	</div>
</div>
