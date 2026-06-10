<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { backOut, quintOut } from 'svelte/easing';
	import type { NhieRoundPhase } from '../types';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardFooter, CardHeader } from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import MdiCheck from '~icons/mdi/check';
	import MdiTimerOutline from '~icons/mdi/timer-outline';
	import MdiHandPointDown from '~icons/mdi/hand-pointing-down';

	interface Props {
		category: string;
		content: string;
		roundNumber: number;
		votedCount: number;
		totalCount: number;
		waitingForPlayers: boolean;
		roundTimeout: number;
		timerStarted: boolean;
		roundPhase: NhieRoundPhase;
		hasMyVote: boolean;
	}

	let {
		category,
		content,
		roundNumber,
		votedCount,
		totalCount,
		waitingForPlayers,
		roundTimeout,
		timerStarted,
		roundPhase,
		hasMyVote
	}: Props = $props();

	const progressPct = $derived(totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0);
	const allVoted = $derived(totalCount > 0 && votedCount >= totalCount);
</script>

{#key content}
	<div in:fade={{ duration: 200, easing: quintOut }}>
		<Card class={roundPhase === 'results' ? 'border-emerald-500/30' : ''}>
			<CardHeader class="pb-0">
				<div class="flex items-center justify-between gap-2">
					<span class="text-muted-foreground text-xs">Round {roundNumber}</span>
					<div class="flex items-center gap-2">
						{#if roundPhase === 'results'}
							<Badge
								variant="secondary"
								class="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
							>
								<MdiCheck class="size-3" />
								Results
							</Badge>
						{/if}
						<div in:fly={{ y: 8, duration: 280, easing: backOut }}>
							<Badge
								variant="secondary"
								class="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
								data-testid="question-category"
							>
								{category}
							</Badge>
						</div>
					</div>
				</div>
			</CardHeader>

			<CardContent class="px-6 py-8 text-center">
				<p class="text-muted-foreground mb-4 text-xs font-medium tracking-[0.2em] uppercase">
					Never have I ever…
				</p>
				<p
					class="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl"
					data-testid="question-content"
				>
					{content}
				</p>

				{#if roundPhase === 'answer' && !hasMyVote}
					<p
						class="text-muted-foreground mt-5 flex items-center justify-center gap-1.5 text-sm"
						in:fly={{ y: 6, duration: 220, easing: backOut }}
					>
						<MdiHandPointDown class="size-4 shrink-0 text-emerald-500" />
						Pick an answer below — the timer starts on the first vote
					</p>
				{/if}
			</CardContent>

			{#if waitingForPlayers || roundPhase === 'answer'}
				<CardFooter class="flex-col gap-2.5 border-t pt-4" role="status">
					<div class="flex w-full items-center justify-between gap-2 text-xs">
						<span class="text-muted-foreground">
							{#if roundPhase === 'answer'}
								<span class="text-foreground font-semibold">Your turn</span>
								{#if totalCount > 1}
									{' '}· {totalCount} playing
								{/if}
							{:else}
								<span class="text-foreground font-semibold">{votedCount}</span>/{totalCount} voted
							{/if}
						</span>

						{#if roundPhase === 'results'}
							<span class="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
								<MdiCheck class="size-3.5" />
								{#if roundTimeout > 0}
									Next question in {roundTimeout}s
								{:else}
									Ready for next question
								{/if}
							</span>
						{:else if allVoted}
							<span class="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
								<MdiCheck class="size-3.5" />
								Everyone's in
							</span>
						{:else if roundPhase === 'waiting' && hasMyVote}
							<span class="text-muted-foreground">Waiting for others…</span>
						{:else if timerStarted && roundTimeout > 0}
							<span class="text-muted-foreground flex items-center gap-1">
								<MdiTimerOutline class="size-3.5" />
								Auto-advance in {roundTimeout}s
							</span>
						{:else if roundPhase === 'waiting'}
							<span class="text-muted-foreground">Timer starts on first vote</span>
						{/if}
					</div>

					{#if roundPhase !== 'answer'}
						<Progress
							value={progressPct}
							class="h-1.5 {allVoted || roundPhase === 'results'
								? '[&_[data-slot=progress-indicator]]:bg-emerald-500'
								: '[&_[data-slot=progress-indicator]]:bg-amber-400'}"
						/>
					{/if}
				</CardFooter>
			{/if}
		</Card>
	</div>
{/key}
