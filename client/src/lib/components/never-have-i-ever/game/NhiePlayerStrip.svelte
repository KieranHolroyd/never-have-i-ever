<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import type { NhieRoundPhase } from '../types';
	import { voteBadgeClass } from '$lib/colour';
	import { avatarColorClass, initials } from '$lib/avatar';
	import type { Player } from '$lib/types';
	import { Avatar, AvatarBadge, AvatarFallback } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger
	} from '$lib/components/ui/collapsible';
	import {
		Item,
		ItemActions,
		ItemContent,
		ItemGroup,
		ItemMedia,
		ItemTitle
	} from '$lib/components/ui/item';
	import { Progress } from '$lib/components/ui/progress';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';

	interface Props {
		players: Player[];
		currentPlayerId?: string | null;
		revealVotes?: boolean;
		roundPhase?: NhieRoundPhase;
	}

	let { players, currentPlayerId = null, revealVotes = false, roundPhase = 'answer' }: Props = $props();

	let expanded = $state(false);

	const voteDotClass: Record<string, string> = {
		Have: 'bg-emerald-500',
		Kinda: 'bg-sky-500',
		'Have Not': 'bg-rose-500'
	};

	const votedCount = $derived(players.filter((p) => p.this_round.voted).length);
	const progressPct = $derived(players.length > 0 ? Math.round((votedCount / players.length) * 100) : 0);
	const allVoted = $derived(players.length > 0 && votedCount >= players.length);

	function sortPlayers(list: Player[]) {
		return [...list].sort((a, b) => {
			if (a.id === currentPlayerId) return -1;
			if (b.id === currentPlayerId) return 1;
			return Number(b.this_round.voted) - Number(a.this_round.voted) || b.score - a.score || a.name.localeCompare(b.name);
		});
	}

	const votedPlayers = $derived(sortPlayers(players.filter((p) => p.this_round.voted)));
	const waitingPlayers = $derived(sortPlayers(players.filter((p) => !p.this_round.voted)));

	const statusLabel = $derived(
		roundPhase === 'results'
			? 'Final votes this round'
			: roundPhase === 'waiting'
				? `${votedCount} of ${players.length} locked in`
				: `${votedCount} of ${players.length} voted this round`
	);
</script>

{#snippet playerRow(player: Player, dimmed = false)}
	<div
		in:fly={{ y: 6, duration: 220, easing: backOut }}
		data-testid={`player-${player.name}`}
	>
		<Item
			variant="outline"
			size="sm"
			class="px-2 py-2 sm:px-2.5 {dimmed ? 'opacity-80' : ''} {player.id === currentPlayerId
				? 'border-emerald-500/30'
				: ''}"
		>
			<ItemMedia>
				<Avatar size="lg">
					<AvatarFallback class="text-xs font-bold {avatarColorClass(player.id)}">
						{initials(player.name)}
					</AvatarFallback>
					<AvatarBadge
						class={revealVotes && player.this_round.voted
							? voteDotClass[player.this_round.vote ?? ''] ?? 'bg-muted-foreground/40'
							: player.this_round.voted
								? 'bg-emerald-500'
								: 'bg-muted-foreground/40'}
					/>
				</Avatar>
			</ItemMedia>
			<ItemContent class="min-w-0">
				<ItemTitle class="text-sm">
					<span class="truncate">{player.name}</span>
					{#if player.id === currentPlayerId}
						<span class="text-muted-foreground shrink-0 text-xs font-normal">(you)</span>
					{/if}
				</ItemTitle>
			</ItemContent>
			<ItemActions class="ml-auto shrink-0 flex-wrap justify-end gap-1">
				{#if revealVotes && player.this_round.voted}
					<Badge variant="secondary" class={voteBadgeClass[player.this_round.vote ?? 'null']}>
						{player.this_round.vote}
					</Badge>
				{:else if player.this_round.voted}
					<Badge variant="secondary" class="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
						Voted
					</Badge>
				{:else}
					<Badge variant="secondary" class={voteBadgeClass['null']}>Not voted</Badge>
				{/if}
				<Badge variant="outline" data-testid={`player-score-${player.name}`}>{player.score} pts</Badge>
			</ItemActions>
		</Item>
	</div>
{/snippet}

<!-- Mobile: compact horizontal strip + optional expanded list -->
<div class="lg:hidden">
	<Collapsible bind:open={expanded}>
		<div class="mb-2 flex items-center justify-between gap-2">
			<p class="text-muted-foreground min-w-0 truncate text-xs">{statusLabel}</p>
			<CollapsibleTrigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm" class="h-7 shrink-0 px-2 text-[10px] uppercase">
						{expanded ? 'Hide' : 'Players'}
					</Button>
				{/snippet}
			</CollapsibleTrigger>
		</div>

		{#if !expanded}
			<div class="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{#each sortPlayers(players) as player (player.id)}
					<div class="shrink-0">
						<Card class="relative min-w-[4.75rem] p-2.5">
							<Badge class="absolute -top-1 -right-1 h-4 px-1 text-[9px]" variant="outline">
								{player.score}
							</Badge>
							<div class="flex flex-col items-center gap-1">
								<Avatar size="sm">
									<AvatarFallback class="text-[9px] font-bold {avatarColorClass(player.id)}">
										{initials(player.name)}
									</AvatarFallback>
									<AvatarBadge
										class={player.this_round.voted
											? revealVotes
												? voteDotClass[player.this_round.vote ?? ''] ?? 'bg-emerald-500'
												: 'bg-emerald-500'
											: 'bg-muted-foreground/40'}
									/>
								</Avatar>
								<span class="max-w-[4.5rem] truncate text-[10px] font-medium">{player.name}</span>
								{#if revealVotes && player.this_round.vote}
									<span class="text-[9px] font-medium {voteBadgeClass[player.this_round.vote]} rounded px-1">
										{player.this_round.vote === 'Have Not' ? 'Nope' : player.this_round.vote}
									</span>
								{/if}
							</div>
						</Card>
					</div>
				{/each}
			</div>
		{/if}

		<CollapsibleContent>
			<Card>
				<CardHeader class="gap-2 pb-2">
					<CardTitle class="text-sm">Players</CardTitle>
					<CardDescription>{statusLabel}</CardDescription>
					<Progress
						value={progressPct}
						class="h-1 {allVoted
							? '[&_[data-slot=progress-indicator]]:bg-emerald-500'
							: '[&_[data-slot=progress-indicator]]:bg-amber-500'}"
					/>
				</CardHeader>
				<CardContent class="max-h-56 space-y-2 overflow-y-auto p-3 pt-0">
					{#each sortPlayers(players) as player (player.id)}
						{@render playerRow(player, !player.this_round.voted)}
					{/each}
				</CardContent>
			</Card>
		</CollapsibleContent>
	</Collapsible>
</div>

<!-- Desktop: full sidebar card -->
<Card class="hidden lg:block">
	<CardHeader class="gap-3">
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<CardTitle class="text-base">Players</CardTitle>
				<CardDescription>{statusLabel}</CardDescription>
			</div>
			<Badge variant="outline" class="shrink-0 tabular-nums">{players.length} in game</Badge>
		</div>
		<Progress
			value={progressPct}
			class="h-1 {allVoted
				? '[&_[data-slot=progress-indicator]]:bg-emerald-500'
				: '[&_[data-slot=progress-indicator]]:bg-amber-500'}"
		/>
	</CardHeader>

	<CardContent class="p-0">
		<ScrollArea class="max-h-80">
			<div class="px-4 pb-4">
				{#if votedPlayers.length > 0}
					<div class="mb-2 flex items-center gap-2">
						<span class="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">Voted</span>
						<span
							class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
							>{votedPlayers.length}</span
						>
					</div>
					<ItemGroup class="gap-1">
						{#each votedPlayers as player (player.id)}
							<div animate:flip={{ duration: 250 }}>
								{@render playerRow(player)}
							</div>
						{/each}
					</ItemGroup>
				{/if}

				{#if votedPlayers.length > 0 && waitingPlayers.length > 0}
					<Separator class="my-3" />
				{/if}

				{#if waitingPlayers.length > 0}
					<div class="mb-2 flex items-center gap-2">
						<span class="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">Waiting</span>
						<span
							class="bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
							>{waitingPlayers.length}</span
						>
					</div>
					<ItemGroup class="gap-1">
						{#each waitingPlayers as player (player.id)}
							<div animate:flip={{ duration: 250 }}>
								{@render playerRow(player, true)}
							</div>
						{/each}
					</ItemGroup>
				{/if}
			</div>
		</ScrollArea>
	</CardContent>
</Card>
