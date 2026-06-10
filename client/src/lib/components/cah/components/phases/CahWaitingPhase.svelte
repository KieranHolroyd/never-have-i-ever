<script lang="ts">
	import LobbyPlayerList from '../../../shared/LobbyPlayerList.svelte';
	import RoomCapacitySettings from '../../../shared/RoomCapacitySettings.svelte';
	import RoomPasswordSettings from '../../../shared/RoomPasswordSettings.svelte';
	import type { CAHGameState } from '$lib/types';
	import MdiCheck from '~icons/mdi/check';
	import MdiContentCopy from '~icons/mdi/content-copy';
	import MdiChevronLeft from '~icons/mdi/chevron-left';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';

	interface Props {
		gameState: CAHGameState;
		canManageRoomPassword?: boolean;
		currentPlayerId?: string | null;
		removingPlayerId?: string | null;
		onGoBack?: () => void;
		roomMaxPlayers?: number;
		roomSizeError?: string | null;
		roomSizeBusy?: boolean;
		roomPasswordError?: string | null;
		roomPasswordBusy?: boolean;
		onSaveRoomSize?: (maxPlayers: number) => void;
		onSaveRoomPassword?: (password: string) => void;
		onClearRoomPassword?: () => void;
		onRemovePlayer?: (playerId: string) => void;
	}

	let {
		gameState,
		canManageRoomPassword = false,
		currentPlayerId = null,
		removingPlayerId = null,
		onGoBack,
		roomMaxPlayers = 20,
		roomSizeError = null,
		roomSizeBusy = false,
		roomPasswordError = null,
		roomPasswordBusy = false,
		onSaveRoomSize,
		onSaveRoomPassword,
		onClearRoomPassword,
		onRemovePlayer
	}: Props = $props();

	const connectedPlayers = $derived(gameState.players.filter((p) => p.connected));
	const isReady = $derived(connectedPlayers.length >= 3);
	const lobbyProgress = $derived(Math.min((connectedPlayers.length / 3) * 100, 100));

	let copied = $state(false);

	function copyInviteLink() {
		const url = window.location.href;
		navigator.clipboard.writeText(url).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}
</script>

<div class="space-y-4" data-testid="cah-waiting">
	<Card>
		<CardHeader>
			<CardDescription>Lobby</CardDescription>
			<CardTitle>{isReady ? 'Ready to start' : 'Waiting for players'}</CardTitle>
			<Badge variant={isReady ? 'default' : 'outline'}>
				{connectedPlayers.length} / 3+
			</Badge>
		</CardHeader>
		<CardContent class="space-y-4">
			<CardDescription>
				{isReady
					? 'Enough players are in — the game will begin shortly.'
					: `Need ${3 - connectedPlayers.length} more player${3 - connectedPlayers.length === 1 ? '' : 's'} to start.`}
			</CardDescription>
			<Progress value={lobbyProgress} />
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="text-base">Invite friends</CardTitle>
			<CardDescription>Share the room link to fill the table.</CardDescription>
		</CardHeader>
		<CardContent>
			<Button
				type="button"
				variant={copied ? 'default' : 'outline'}
				class="w-full"
				onclick={copyInviteLink}
			>
				{#if copied}
					<MdiCheck />
					Link copied!
				{:else}
					<MdiContentCopy />
					Copy invite link
				{/if}
			</Button>
		</CardContent>
	</Card>

	<LobbyPlayerList
		players={gameState.players}
		creatorPlayerId={gameState.creatorPlayerId ?? null}
		{currentPlayerId}
		canManagePlayers={canManageRoomPassword}
		{removingPlayerId}
		{onRemovePlayer}
		title="Table"
	/>

	{#if canManageRoomPassword}
		<div class="grid gap-4">
			{#if onSaveRoomSize}
				<RoomCapacitySettings
					maxPlayers={roomMaxPlayers}
					currentPlayers={gameState.players.length}
					minPlayers={3}
					error={roomSizeError}
					busy={roomSizeBusy}
					onSave={onSaveRoomSize}
				/>
			{/if}
			{#if onSaveRoomPassword && onClearRoomPassword}
				<RoomPasswordSettings
					passwordProtected={Boolean(gameState.passwordProtected)}
					error={roomPasswordError}
					busy={roomPasswordBusy}
					onSave={onSaveRoomPassword}
					onClear={onClearRoomPassword}
				/>
			{/if}
		</div>
	{/if}

	{#if onGoBack}
		<Button type="button" variant="ghost" class="w-full" onclick={onGoBack}>
			<MdiChevronLeft />
			Change packs / settings
		</Button>
	{/if}
</div>
