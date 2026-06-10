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
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
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
</script>

<Card>
	<CardHeader class="gap-3">
		<div class="flex items-start justify-between gap-2">
			<div>
				<CardTitle class="text-base">Players</CardTitle>
				<CardDescription>
					{#if roundPhase === 'results'}
						Final votes this round
					{:else if roundPhase === 'waiting'}
						{votedCount} of {players.length} locked in
					{:else}
						{votedCount} of {players.length} voted this round
					{/if}
				</CardDescription>
			</div>
			<Badge variant="outline" class="shrink-0 tabular-nums">
				{players.length} in game
			</Badge>
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
						<span class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">{votedPlayers.length}</span>
					</div>
					<ItemGroup class="gap-1">
						{#each votedPlayers as player, index (player.id)}
							<div
								in:fly={{ y: 6, duration: 220, delay: Math.min(index * 25, 300), easing: backOut }}
								animate:flip={{ duration: 250 }}
								data-testid={`player-${player.name}`}
							>
								<Item
									variant="outline"
									size="sm"
									class="px-2.5 py-2 {player.id === currentPlayerId ? 'border-emerald-500/30' : ''}"
								>
									<ItemMedia>
										<Avatar size="lg">
											<AvatarFallback class="text-xs font-bold {avatarColorClass(player.id)}">
												{initials(player.name)}
											</AvatarFallback>
											<AvatarBadge
												class={revealVotes
													? voteDotClass[player.this_round.vote ?? ''] ?? 'bg-muted-foreground/40'
													: 'bg-emerald-500'}
											/>
										</Avatar>
									</ItemMedia>
									<ItemContent>
										<ItemTitle class="text-sm">
											{player.name}
											{#if player.id === currentPlayerId}
												<span class="text-muted-foreground text-xs font-normal">(you)</span>
											{/if}
										</ItemTitle>
									</ItemContent>
									<ItemActions class="flex-col items-end gap-1 sm:flex-row sm:items-center">
										{#if revealVotes}
											<Badge
												variant="secondary"
												class={voteBadgeClass[player.this_round.vote ?? 'null']}
											>
												{player.this_round.vote}
											</Badge>
										{:else}
											<Badge variant="secondary" class="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
												Voted
											</Badge>
										{/if}
										<Badge variant="outline" data-testid={`player-score-${player.name}`}>
											{player.score} pts
										</Badge>
									</ItemActions>
								</Item>
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
						<span class="bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">{waitingPlayers.length}</span>
					</div>
					<ItemGroup class="gap-1">
						{#each waitingPlayers as player, index (player.id)}
							<div
								in:fly={{ y: 6, duration: 220, delay: Math.min(index * 25, 300), easing: backOut }}
								animate:flip={{ duration: 250 }}
								data-testid={`player-${player.name}`}
							>
								<Item
									variant="outline"
									size="sm"
									class="px-2.5 py-2 opacity-80 {player.id === currentPlayerId
										? 'border-emerald-500/30'
										: ''}"
								>
									<ItemMedia>
										<Avatar size="lg">
											<AvatarFallback class="text-xs font-bold {avatarColorClass(player.id)}">
												{initials(player.name)}
											</AvatarFallback>
											<AvatarBadge class="bg-muted-foreground/40" />
										</Avatar>
									</ItemMedia>
									<ItemContent>
										<ItemTitle class="text-sm">
											{player.name}
											{#if player.id === currentPlayerId}
												<span class="text-muted-foreground text-xs font-normal">(you)</span>
											{/if}
										</ItemTitle>
									</ItemContent>
									<ItemActions class="flex-col items-end gap-1 sm:flex-row sm:items-center">
										<Badge variant="secondary" class={voteBadgeClass['null']}>
											Not voted
										</Badge>
										<Badge variant="outline" data-testid={`player-score-${player.name}`}>
											{player.score} pts
										</Badge>
									</ItemActions>
								</Item>
							</div>
						{/each}
					</ItemGroup>
				{/if}
			</div>
		</ScrollArea>
	</CardContent>
</Card>
