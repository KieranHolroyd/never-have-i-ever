<script lang="ts">
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
		title?: string;
	}

	let {
		players = [],
		creatorPlayerId = null,
		currentPlayerId = null,
		canManagePlayers = false,
		removingPlayerId = null,
		onRemovePlayer,
		title = 'Players'
	}: Props = $props();

	const sortedPlayers = $derived(
		[...players].sort(
			(a, b) => Number(b.connected) - Number(a.connected) || a.name.localeCompare(b.name)
		)
	);

	function removePlayer(playerId: string) {
		onRemovePlayer?.(playerId);
	}
</script>

<div class="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
	<div class="flex items-center justify-between gap-3">
		<div>
			<p class="text-[11px] font-black uppercase tracking-[0.25em] text-white/35">{title}</p>
			<p class="mt-1 text-sm text-white/55">{players.length} player{players.length === 1 ? '' : 's'} in room</p>
		</div>
	</div>

	<div class="mt-4 space-y-2">
		{#each sortedPlayers as player (player.id)}
			<div class="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5">
				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-2">
						<p class="truncate text-sm font-bold text-white">
							{player.name}
							{#if player.id === currentPlayerId}
								<span class="text-white/45">(You)</span>
							{/if}
						</p>
						{#if player.id === creatorPlayerId}
							<span class="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
								Creator
							</span>
						{/if}
					</div>
					<p class="mt-1 text-xs text-white/40">
						{player.connected ? 'Connected' : 'Disconnected'}
					</p>
				</div>

				{#if canManagePlayers && player.id !== currentPlayerId}
					<button
						type="button"
						class="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-red-200 transition hover:border-red-400/35 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={removingPlayerId !== null}
						onclick={() => removePlayer(player.id)}
					>
						{removingPlayerId === player.id ? 'Removing' : 'Remove'}
					</button>
				{/if}
			</div>
		{/each}
	</div>
</div>