<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { backOut, quintOut } from 'svelte/easing';
	import type { Player } from '$lib/types';
	import type { GameRound } from '$lib/types';
	import History from '../History.svelte';
	import NhieStickyActionBar from '../NhieStickyActionBar.svelte';
	import { avatarColorClass, initials } from '$lib/avatar';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';

	interface Props {
		players: Player[];
		history: GameRound[];
		onReset: () => void;
	}

	let { players, history, onReset }: Props = $props();

	const ranked = $derived([...players].sort((a, b) => b.score - a.score));
	const winner = $derived(ranked[0] ?? null);
	const rest = $derived(ranked.slice(1));

	function rankLabel(rank: number) {
		if (rank === 0) return '🥇';
		if (rank === 1) return '🥈';
		if (rank === 2) return '🥉';
		return `#${rank + 1}`;
	}

	function rowClass(rank: number) {
		if (rank === 1) return 'border-muted-foreground/20 bg-muted/30';
		if (rank === 2) return 'border-orange-500/20 bg-orange-500/5';
		return '';
	}
</script>

<div class="space-y-4 pt-3 pb-28" data-testid="nhie-game-over" in:fade={{ duration: 300 }}>

	<!-- Winner spotlight -->
	{#if winner}
		<div in:scale={{ duration: 350, start: 0.92, easing: backOut }}>
			<Card class="text-center">
				<CardHeader class="pb-2">
					<div class="mx-auto mb-2 text-5xl" aria-hidden="true">🏆</div>
					<CardTitle class="text-2xl font-bold tracking-tight">{winner.name} wins!</CardTitle>
					<CardDescription>with {winner.score} point{winner.score === 1 ? '' : 's'}</CardDescription>
				</CardHeader>
				<CardContent class="pb-5">
					<div in:scale={{ duration: 300, start: 0.8, delay: 200, easing: backOut }}>
						<Avatar size="lg" class="mx-auto size-16">
							<AvatarFallback class="text-lg font-bold {avatarColorClass(winner.id)}">
								{initials(winner.name)}
							</AvatarFallback>
						</Avatar>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2 lg:items-start">
		<!-- Leaderboard -->
		{#if rest.length > 0}
			<div class="space-y-2">
				<p class="text-muted-foreground px-1 text-[10px] font-semibold tracking-widest uppercase">
					Final standings
				</p>
				{#each rest as player, i (player.id)}
					{@const rank = i + 1}
					<div in:fly={{ y: 8, duration: 240, delay: i * 50, easing: quintOut }}>
						<Card size="sm" class={rowClass(rank)}>
							<CardContent class="flex items-center gap-3 py-3">
								<span class="w-8 text-center text-xl shrink-0">{rankLabel(rank)}</span>
								<Avatar size="lg">
									<AvatarFallback class="text-xs font-bold {avatarColorClass(player.id)}">
										{initials(player.name)}
									</AvatarFallback>
								</Avatar>
								<span class="min-w-0 flex-1 truncate font-medium">{player.name}</span>
								<Badge variant="secondary" class="shrink-0 tabular-nums">
									{player.score} pts
								</Badge>
							</CardContent>
						</Card>
					</div>
				{/each}
			</div>
		{/if}

		<!-- History -->
		<History {history} />
	</div>

	<NhieStickyActionBar>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<p class="text-muted-foreground text-xs">Same room, same players — new questions.</p>
			<Button
				variant="emerald"
				size="lg"
				class="h-12 w-full text-base font-semibold sm:w-auto sm:px-8"
				onclick={onReset}
			>
				Play again
			</Button>
		</div>
	</NhieStickyActionBar>
</div>
