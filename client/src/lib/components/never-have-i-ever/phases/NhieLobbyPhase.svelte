<script lang="ts">
	import { Status, type Player } from '$lib/types';
	import PreGameConnection from '../PreGameConnection.svelte';
	import RoomCapacitySettings from '../../shared/RoomCapacitySettings.svelte';
	import RoomPasswordSettings from '../../shared/RoomPasswordSettings.svelte';

	interface Props {
		connection: Status;
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
		connection,
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

	const isReady = $derived(connectedPlayerCount >= 1);

	function copyInviteLink() {
		navigator.clipboard.writeText(window.location.href).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}
</script>

<div class="mx-auto mt-4 w-full max-w-lg space-y-4" data-testid="nhie-lobby">
	<div class="rounded-2xl border border-white/8 bg-zinc-950 p-5 sm:p-6">
		<p class="nhie-phase-label">Lobby</p>
		<h2 class="mt-1 text-2xl font-black text-white">
			{isReady ? 'Room is open' : 'Waiting for players'}
		</h2>
		<p class="mt-1 text-sm text-white/45">
			{connectedPlayerCount >= 2
				? 'Share the link, then pick your categories.'
				: 'Invite friends with the link below — you can pick categories while you wait.'}
		</p>
		<div class="mt-4 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
			<div class="rounded-full border border-white/10 px-3 py-1">
				{connectedPlayerCount}/{roomMaxPlayers} seats
			</div>
			<div class="rounded-full border border-white/10 px-3 py-1">{roomPrivacyLabel}</div>
		</div>
		<div class="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
			<div
				class="h-full rounded-full transition-all duration-500 {isReady ? 'bg-emerald-400' : 'bg-white/40'}"
				style="width: {Math.min(connectedPlayerCount >= 2 ? 100 : connectedPlayerCount * 50, 100)}%"
			></div>
		</div>
	</div>

	<div class="rounded-2xl border border-white/8 bg-zinc-950 p-5">
		<p class="text-sm font-bold text-white/80">Invite friends</p>
		<p class="mt-0.5 text-sm text-white/40">Anyone with this link can join your room.</p>
		<button
			type="button"
			class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all
			{copied
				? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
				: 'border-white/10 bg-white/[0.05] text-white/60 hover:border-emerald-500/30 hover:text-white'}"
			onclick={copyInviteLink}
		>
			{copied ? 'Link copied!' : 'Copy invite link'}
		</button>
	</div>

	<PreGameConnection
		{connection}
		{players}
		{creatorPlayerId}
		{currentPlayerId}
		canManagePlayers={canManageRoomPassword}
		{removingPlayerId}
		onRemovePlayer={onRemovePlayer}
	/>

	{#if canManageRoomPassword}
		<div class="rounded-2xl border border-white/8 bg-zinc-950 overflow-hidden">
			<button
				type="button"
				class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-white/70 hover:bg-white/[0.03]"
				onclick={() => (settingsOpen = !settingsOpen)}
			>
				Room settings
				<span class="text-white/30">{settingsOpen ? '−' : '+'}</span>
			</button>
			{#if settingsOpen}
				<div class="grid gap-4 border-t border-white/8 p-4">
					<RoomCapacitySettings
						maxPlayers={roomMaxPlayers}
						currentPlayers={players.length}
						minPlayers={2}
						error={roomSizeError}
						busy={roomSizeSaving}
						onSave={onSaveRoomSize}
					/>
					<RoomPasswordSettings
						passwordProtected={roomProtected}
						error={roomPasswordError}
						busy={roomPasswordSaving}
						onSave={onSaveRoomPassword}
						onClear={onClearRoomPassword}
					/>
				</div>
			{/if}
		</div>
	{/if}

	<button
		type="button"
		class="w-full rounded-xl bg-emerald-500 py-3.5 text-base font-black text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
		disabled={!isReady}
		onclick={onContinueToCategories}
	>
		Choose categories
	</button>
</div>
