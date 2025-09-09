<script lang="ts">
	import { Status, type Player } from '$lib/types';

	interface Props {
		connection?: Status;
		players?: Player[];
		errors?: any[];
	}

	let { connection = Status.DISCONNECTED, players = [], errors = [] }: Props = $props();
</script>

<div class="fixed top-2 right-2 z-30">
	<div class="panel p-2 w-56 max-h-[60vh] overflow-auto text-slate-100 text-xs">
		<details>
			<summary class="cursor-pointer font-semibold">
				{#if connection === Status.CONNECTING}
					<span class="text-yellow-300">Connecting…</span>
				{:else if connection === Status.CONNECTED}
					<span class="text-emerald-300">Connected</span>
				{:else}
					<span class="text-red-300">Disconnected</span>
				{/if}
			</summary>
			<div class="mt-1">
				<p class="uppercase text-[10px] opacity-70 mb-1">Players</p>
				<ul class="space-y-0.5">
					{#each players as player}
						<li class={`${!player.connected ? 'line-through opacity-60' : ''} flex justify-between`}>
							<span>{player.name}</span>
							{#if player.connected}<span class="text-emerald-300">{player.score}</span>{/if}
						</li>
					{/each}
				</ul>
			</div>
			<details class="mt-2">
				<summary class="cursor-pointer font-semibold">Debug</summary>
				<ul class="mt-1 space-y-0.5 text-[10px] opacity-80">
					{#each errors as error}
						<li>{error.message}</li>
					{/each}
				</ul>
			</details>
		</details>
	</div>
</div>
