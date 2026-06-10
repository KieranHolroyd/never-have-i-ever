<script lang="ts">
	import type { Player } from '$lib/types';
	import LobbyPlayerList from '../../shared/LobbyPlayerList.svelte';
	import RoomCapacitySettings from '../../shared/RoomCapacitySettings.svelte';
	import RoomPasswordSettings from '../../shared/RoomPasswordSettings.svelte';
	import NhieStickyActionBar from '../NhieStickyActionBar.svelte';
	import MdiContentCopy from '~icons/mdi/content-copy';
	import MdiCheck from '~icons/mdi/check';
	import MdiCogOutline from '~icons/mdi/cog-outline';
	import MdiChevronDown from '~icons/mdi/chevron-down';
	import MdiLockOutline from '~icons/mdi/lock-outline';
	import MdiEarth from '~icons/mdi/earth';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
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

	interface Props {
		players: Player[];
		connectedPlayerCount: number;
		roomMaxPlayers: number;
		roomPrivacyLabel: string;
		creatorPlayerId: string | null;
		currentPlayerId: string | null;
		canManageRoomPassword: boolean;
		removingPlayerId: string | null;
		roomSizeError: string | null;
		roomSizeSaving: boolean;
		roomPasswordError: string | null;
		roomPasswordSaving: boolean;
		roomProtected: boolean;
		onRemovePlayer: (playerId: string) => void;
		onSaveRoomSize: (maxPlayers: number) => void;
		onSaveRoomPassword: (password: string) => void;
		onClearRoomPassword: () => void;
		onContinueToCategories: () => void;
	}

	let {
		players,
		connectedPlayerCount,
		roomMaxPlayers,
		roomPrivacyLabel,
		creatorPlayerId,
		currentPlayerId,
		canManageRoomPassword,
		removingPlayerId,
		roomSizeError,
		roomSizeSaving,
		roomPasswordError,
		roomPasswordSaving,
		roomProtected,
		onRemovePlayer,
		onSaveRoomSize,
		onSaveRoomPassword,
		onClearRoomPassword,
		onContinueToCategories
	}: Props = $props();

	let copied = $state(false);
	let settingsOpen = $state(false);

	const readyForCategories = $derived(connectedPlayerCount >= 1);

	// Show up to 8 seat dots; overflow is summarised as "+n"
	const visibleSeatCount = $derived(Math.min(roomMaxPlayers, 8));
	const overflowSeats = $derived(Math.max(roomMaxPlayers - 8, 0));

	let inviteUrl = $state('');

	$effect(() => {
		inviteUrl = window.location.host + window.location.pathname;
	});

	function copyInviteLink() {
		navigator.clipboard.writeText(window.location.href).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}
</script>

<div class="grid gap-4 pb-32 pt-3 lg:grid-cols-5 lg:items-start" data-testid="nhie-lobby">
	<div class="space-y-4 lg:col-span-3">
	<Card>
		<CardHeader>
			<div class="flex items-center justify-between gap-2">
				<Badge variant="outline" class="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
					<MdiAccountGroup class="size-3.5" />
					Step 1 of 3
				</Badge>
				<Badge variant="secondary" class="gap-1">
					{#if roomProtected}
						<MdiLockOutline class="size-3" />
					{:else}
						<MdiEarth class="size-3" />
					{/if}
					{roomPrivacyLabel}
				</Badge>
			</div>
			<CardTitle class="mt-2 text-3xl tracking-tight">
				{connectedPlayerCount >= 2 ? "Everyone's here" : 'Waiting for players'}
			</CardTitle>
			<CardDescription class="text-sm leading-relaxed">
				{#if connectedPlayerCount >= 2}
					Copy the link for anyone still arriving, then pick your question categories.
				{:else if connectedPlayerCount === 1}
					Share the invite link below — you can pick categories while you wait.
				{:else}
					Share the invite link to get your friends in the room.
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-5">
			<!-- Seat dots -->
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-1.5">
					{#each Array.from({ length: visibleSeatCount }) as _, i (i)}
						<span
							class="size-2.5 rounded-full transition-all duration-300 {i < connectedPlayerCount
								? 'bg-emerald-500 scale-110'
								: 'bg-muted-foreground/20'}"
						></span>
					{/each}
					{#if overflowSeats > 0}
						<span class="text-muted-foreground ml-0.5 text-[10px] font-medium">+{overflowSeats}</span>
					{/if}
				</div>
				<span class="text-muted-foreground text-xs">
					{connectedPlayerCount} of {roomMaxPlayers} seats filled
				</span>
			</div>

			<!-- Invite link -->
			<div class="space-y-1.5">
				<p class="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">Invite link</p>
				<div class="flex items-stretch gap-2">
					<div
						class="bg-muted text-muted-foreground flex min-w-0 flex-1 items-center rounded-lg px-3 py-2 font-mono text-xs"
					>
						<span class="truncate">{inviteUrl}</span>
					</div>
					<Button
						variant={copied ? 'secondary' : 'default'}
						size="sm"
						class="h-auto shrink-0 px-3 {copied ? 'text-emerald-600 dark:text-emerald-400' : ''}"
						onclick={copyInviteLink}
					>
						{#if copied}
							<MdiCheck class="size-4" />
							Copied
						{:else}
							<MdiContentCopy class="size-4" />
							Copy
						{/if}
					</Button>
				</div>
			</div>
		</CardContent>
	</Card>

	{#if canManageRoomPassword}
		<Collapsible bind:open={settingsOpen}>
			<Card class="overflow-hidden">
				<CollapsibleTrigger class="hover:bg-muted/40 w-full transition-colors">
					<CardHeader class="flex-row items-center justify-between gap-3 py-1">
						<div class="flex items-center gap-3 text-left">
							<span class="bg-muted inline-flex size-8 items-center justify-center rounded-lg">
								<MdiCogOutline class="text-muted-foreground size-4" />
							</span>
							<div>
								<CardTitle class="text-sm">Room settings</CardTitle>
								<CardDescription class="mt-0.5 text-xs">Capacity & password</CardDescription>
							</div>
						</div>
						<MdiChevronDown
							class="text-muted-foreground size-5 transition-transform duration-200 {settingsOpen
								? 'rotate-180'
								: ''}"
						/>
					</CardHeader>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<CardContent class="space-y-6 border-t pt-5">
						<RoomCapacitySettings
							embedded
							maxPlayers={roomMaxPlayers}
							currentPlayers={players.length}
							minPlayers={2}
							error={roomSizeError}
							busy={roomSizeSaving}
							onSave={onSaveRoomSize}
						/>
						<Separator />
						<RoomPasswordSettings
							embedded
							passwordProtected={roomProtected}
							error={roomPasswordError}
							busy={roomPasswordSaving}
							onSave={onSaveRoomPassword}
							onClear={onClearRoomPassword}
						/>
					</CardContent>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	{/if}
	</div>

	<div class="lg:col-span-2">
		<LobbyPlayerList
			{players}
			{creatorPlayerId}
			{currentPlayerId}
			canManagePlayers={canManageRoomPassword}
			{removingPlayerId}
			onRemovePlayer={onRemovePlayer}
		/>
	</div>
</div>

<NhieStickyActionBar>
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<p class="text-muted-foreground text-xs">
			{#if !readyForCategories}
				Join the room to continue
			{:else}
				{connectedPlayerCount} player{connectedPlayerCount === 1 ? '' : 's'} in the room
			{/if}
		</p>
		<Button
			variant="emerald"
			size="lg"
			class="h-12 w-full text-base font-semibold sm:w-auto sm:px-8"
			disabled={!readyForCategories}
			onclick={onContinueToCategories}
		>
			Choose categories
		</Button>
	</div>
</NhieStickyActionBar>
