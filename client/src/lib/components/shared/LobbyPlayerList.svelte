<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Status } from '$lib/types';
	import { avatarColorClass, initials } from '$lib/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Avatar, AvatarBadge, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		Empty,
		EmptyDescription,
		EmptyHeader,
		EmptyMedia,
		EmptyTitle
	} from '$lib/components/ui/empty';
	import {
		Item,
		ItemActions,
		ItemContent,
		ItemGroup,
		ItemMedia,
		ItemTitle
	} from '$lib/components/ui/item';

	interface LobbyPlayer {
		id: string;
		name: string;
		connected: boolean;
	}

	interface Props {
		players?: LobbyPlayer[];
		creatorPlayerId?: string | null;
		currentPlayerId?: string | null;
		canManagePlayers?: boolean;
		removingPlayerId?: string | null;
		onRemovePlayer?: (playerId: string) => void;
		connection?: Status;
		showConnection?: boolean;
		title?: string;
	}

	let {
		players = [],
		creatorPlayerId = null,
		currentPlayerId = null,
		canManagePlayers = false,
		removingPlayerId = null,
		onRemovePlayer,
		connection = Status.DISCONNECTED,
		showConnection = false,
		title = 'Players'
	}: Props = $props();

	const sortedPlayers = $derived(
		[...players].sort(
			(a, b) => Number(b.connected) - Number(a.connected) || a.name.localeCompare(b.name)
		)
	);

	const onlineCount = $derived(players.filter((p) => p.connected).length);

	const connectionVariant = $derived(
		connection === Status.CONNECTED
			? 'default'
			: connection === Status.DISCONNECTED
				? 'destructive'
				: 'secondary'
	);

	const connectionLabel = $derived(
		connection === Status.CONNECTED
			? 'Connected'
			: connection === Status.DISCONNECTED
				? 'Offline'
				: 'Joining'
	);
</script>

<Card>
	<CardHeader class="flex-row items-center justify-between gap-3">
		<div>
			<CardTitle class="text-base">{title}</CardTitle>
			<CardDescription>
				{players.length === 0
					? 'Friends will show up here once they join.'
					: `${onlineCount} online · ${players.length} in room`}
			</CardDescription>
		</div>
		{#if showConnection}
			<Badge variant={connectionVariant} class="gap-1.5">
				<span
					class="size-1.5 rounded-full {connection === Status.CONNECTED
						? 'bg-emerald-400'
						: connection === Status.DISCONNECTED
							? 'bg-white/80'
							: 'animate-pulse bg-amber-400'}"
				></span>
				{connectionLabel}
			</Badge>
		{/if}
	</CardHeader>
	<CardContent>
		{#if sortedPlayers.length === 0}
			<Empty class="border py-8">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<span class="animate-pulse">👋</span>
					</EmptyMedia>
					<EmptyTitle class="text-sm">No one here yet</EmptyTitle>
					<EmptyDescription class="text-xs">
						Share the invite link above to fill the room.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		{:else}
			<ItemGroup class="gap-1.5">
				{#each sortedPlayers as player (player.id)}
					<div
						in:fly={{ y: 6, duration: 220, easing: quintOut }}
						animate:flip={{ duration: 250 }}
					>
						<Item variant="outline" class={player.connected ? '' : 'opacity-55'}>
							<ItemMedia>
								<Avatar size="lg">
									<AvatarFallback class="text-xs font-bold {avatarColorClass(player.id)}">
										{initials(player.name)}
									</AvatarFallback>
									<AvatarBadge
										class={player.connected ? 'bg-emerald-500' : 'bg-muted-foreground/40'}
									/>
								</Avatar>
							</ItemMedia>
							<ItemContent>
								<ItemTitle>
									<span class="truncate">{player.name}</span>
									{#if player.id === currentPlayerId}
										<span class="text-muted-foreground text-xs font-normal">(you)</span>
									{/if}
								</ItemTitle>
								<p class="text-muted-foreground text-xs">
									{player.connected ? 'Online' : 'Away'}
								</p>
							</ItemContent>
							<ItemActions>
								{#if player.id === creatorPlayerId}
									<Badge
										variant="secondary"
										class="border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300"
									>
										Host
									</Badge>
								{/if}
								{#if canManagePlayers && player.id !== currentPlayerId}
									<Button
										variant="destructive"
										size="sm"
										disabled={removingPlayerId !== null}
										onclick={() => onRemovePlayer?.(player.id)}
									>
										{removingPlayerId === player.id ? 'Removing' : 'Remove'}
									</Button>
								{/if}
							</ItemActions>
						</Item>
					</div>
				{/each}
			</ItemGroup>
		{/if}
	</CardContent>
</Card>
