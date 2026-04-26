<script lang="ts">
	import { Status, type Player } from '$lib/types';
	import LobbyPlayerList from '../shared/LobbyPlayerList.svelte';

	interface Props {
		connection?: Status;
		players?: Player[];
		creatorPlayerId?: string | null;
		currentPlayerId?: string | null;
		canManagePlayers?: boolean;
		removingPlayerId?: string | null;
		onRemovePlayer?: (playerId: string) => void;
	}

	let {
		connection = Status.DISCONNECTED,
		players = [],
		creatorPlayerId = null,
		currentPlayerId = null,
		canManagePlayers = false,
		removingPlayerId = null,
		onRemovePlayer
	}: Props = $props();
</script>

<div class="w-full space-y-3">
	<div class="rounded-2xl border border-white/8 bg-zinc-950 px-4 py-3 text-left">
		<div class="flex items-center justify-between gap-3">
			<p class="text-[11px] font-black uppercase tracking-[0.26em] text-white/30">Players</p>
			<div class="flex flex-wrap justify-end gap-2 text-[11px] font-black uppercase tracking-[0.18em]">
				<div class="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-white/50">
					{players.filter((p) => p.connected).length} online
				</div>
				<div
					class={`rounded-full border px-3 py-1 ${connection === Status.CONNECTED
						? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
						: connection === Status.DISCONNECTED
							? 'border-red-400/20 bg-red-500/10 text-red-300'
							: 'border-white/10 bg-white/[0.05] text-white/45'}`}
				>
					{#if connection === Status.CONNECTED}
						Connected
					{:else if connection === Status.DISCONNECTED}
						Offline
					{:else}
						Joining
					{/if}
				</div>
			</div>
		</div>
	</div>

	<LobbyPlayerList
		{players}
		{creatorPlayerId}
		{currentPlayerId}
		{canManagePlayers}
		{removingPlayerId}
		{onRemovePlayer}
		title="Lobby"
	/>
</div>
