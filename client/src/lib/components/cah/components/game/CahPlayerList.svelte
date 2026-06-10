<script lang="ts">
	import type { CAHGameState } from '$lib/types';
	import { sortPlayersByScore, getPlayerInitials } from '../../utils/cah-utils';
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		Item,
		ItemActions,
		ItemContent,
		ItemDescription,
		ItemGroup,
		ItemMedia,
		ItemTitle
	} from '$lib/components/ui/item';

	interface Props {
		gameState: CAHGameState;
		currentPlayerId: string;
	}

	let { gameState, currentPlayerId }: Props = $props();

	const connectedPlayers = $derived(gameState.players.filter((p) => p.connected));
	const sortedPlayers = $derived(sortPlayersByScore(connectedPlayers));
	const playersNeeded = $derived(Math.max(0, 3 - connectedPlayers.length));
	const submittedPlayerIds = $derived(
		new Set((gameState.submittedCards ?? []).map((s) => s.playerId))
	);

	function playerStatus(player: (typeof sortedPlayers)[number]) {
		if (player.isJudge) return 'judging';
		if (gameState.phase === 'selecting' && submittedPlayerIds.has(player.id)) return 'submitted';
		if (gameState.phase === 'selecting') return 'choosing…';
		return 'watching';
	}
</script>

<Card>
	<CardHeader class="border-b [.border-b]:pb-3">
		<CardTitle class="text-sm">Leaderboard</CardTitle>
		{#if playersNeeded > 0}
			<Badge variant="secondary" class="text-amber-500">Need {playersNeeded} more</Badge>
		{:else}
			<Badge variant="outline">{connectedPlayers.length} players</Badge>
		{/if}
	</CardHeader>

	<CardContent class="p-0">
		<ItemGroup>
			{#each sortedPlayers as player, i (player.id)}
				{@const isCurrentPlayer = player.id === currentPlayerId}
				<div in:fly={{ y: 6, duration: 180 }} animate:flip={{ duration: 200 }}>
				<Item
					variant="outline"
					class={player.isJudge ? 'bg-amber-500/5' : isCurrentPlayer ? 'bg-muted/50' : ''}
				>
					<ItemMedia>
						<span class="text-muted-foreground w-4 text-center text-xs font-bold">{i + 1}</span>
					</ItemMedia>
					<ItemMedia>
						<Avatar size="sm">
							<AvatarFallback
								class={player.isJudge
									? 'bg-amber-500/20 text-amber-200'
									: isCurrentPlayer
										? 'bg-muted text-foreground'
										: ''}
							>
								{getPlayerInitials(player.name)}
							</AvatarFallback>
						</Avatar>
					</ItemMedia>
					<ItemContent>
						<ItemTitle>
							{player.name}
							{#if isCurrentPlayer}
								<span class="text-muted-foreground font-normal">(you)</span>
							{/if}
							{#if player.isJudge}
								<Badge variant="secondary" class="text-amber-500">Judge</Badge>
							{/if}
						</ItemTitle>
						<ItemDescription>{playerStatus(player)}</ItemDescription>
					</ItemContent>
					<ItemActions>
						<span class="text-xl font-bold {i === 0 ? 'text-foreground' : 'text-muted-foreground'}">
							{player.score}
						</span>
					</ItemActions>
				</Item>
				</div>
			{/each}
		</ItemGroup>
	</CardContent>
</Card>
