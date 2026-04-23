<script lang="ts">
	import { Status, type Player } from '$lib/types';

	interface Props {
		connection?: Status;
		players?: Player[];
		errors?: any[];
		ping?: number;
	}

	let { connection = Status.DISCONNECTED, players = [], errors = [], ping = 0 }: Props = $props();

	const statusColor = $derived(
		connection === Status.CONNECTED
			? 'bg-emerald-400'
			: connection === Status.CONNECTING
				? 'bg-yellow-400 animate-pulse'
				: 'bg-red-400'
	);
	const statusLabel = $derived(
		connection === Status.CONNECTED
			? 'Connected'
			: connection === Status.CONNECTING
				? 'Connecting…'
				: 'Disconnected'
	);
	const pingColor = $derived(
		ping === 0 ? 'text-zinc-400' : ping < 80 ? 'text-emerald-400' : ping < 200 ? 'text-yellow-400' : 'text-red-400'
	);
</script>

<!-- Anchored below the navbar, left side, above the share button -->
<div class="fixed top-16 right-2 z-30">
	<details class="group">
		<summary
			class="flex items-center gap-2 cursor-pointer select-none
				rounded-lg bg-zinc-900/90 border border-zinc-700/60 backdrop-blur-sm
				px-2.5 py-1.5 text-xs font-medium shadow list-none"
		>
			<span class="inline-block w-2 h-2 rounded-full shrink-0 {statusColor}"></span>
			<span class="text-zinc-200">{statusLabel}</span>
			{#if ping > 0}
				<span class="{pingColor} font-mono tabular-nums">{ping.toFixed(0)}ms</span>
			{/if}
		</summary>

		<div
			class="absolute right-0 mt-1.5 w-52 rounded-xl bg-zinc-900/95 border border-zinc-700/60
				backdrop-blur-sm shadow-xl text-xs text-zinc-300 overflow-hidden"
		>
			<!-- Players list -->
			{#if players.length > 0}
				<div class="px-3 py-2.5 border-b border-zinc-800">
					<p class="uppercase text-[10px] font-bold text-zinc-500 mb-1.5 tracking-wide">Players</p>
					<ul class="space-y-1">
						{#each players as player (player.id)}
							<li class="flex items-center justify-between gap-2 {!player.connected ? 'opacity-40' : ''}">
								<span class="flex items-center gap-1.5 min-w-0">
									<span class="w-1.5 h-1.5 rounded-full shrink-0 {player.connected ? 'bg-emerald-400' : 'bg-zinc-600'}"></span>
									<span class="truncate">{player.name}</span>
								</span>
								<span class="shrink-0 font-mono text-zinc-400">{player.score}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Errors (debug) -->
			{#if errors.length > 0}
				<details class="px-3 py-2">
					<summary class="cursor-pointer font-semibold text-zinc-400 list-none text-[10px] uppercase tracking-wide">
						Debug ({errors.length})
					</summary>
					<ul class="mt-1 space-y-0.5 text-[10px] text-zinc-500 max-h-32 overflow-auto">
						{#each errors as error, index (index)}
							<li class="break-all">{error.error?.message ?? error.message ?? JSON.stringify(error)}</li>
						{/each}
					</ul>
				</details>
			{/if}
		</div>
	</details>
</div>
