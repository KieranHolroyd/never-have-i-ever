<script lang="ts">
	import { Status, type Player } from '$lib/types';

	export let connection: Status = Status.DISCONNECTED;
	export let players: Player[] = [];
	export let errors: any[] = [];
</script>

<div class="connection_info">
	{#if connection === Status.CONNECTING}
		Connecting...
	{:else if connection === Status.CONNECTED}
		Connected
	{:else if connection === Status.DISCONNECTED}
		Disconnected
	{/if}
	<br />
	<details>
		<summary>
			({players.filter((p) => p.connected).length} player{players.length > 1 ? 's' : ''})
		</summary>
		<ul>
			{#each players as player}
				<li class={`${!player.connected ? 'line-through text-gray-600' : ''}`}>
					{player.name}
					{#if player.connected}({player.score}){/if}
				</li>
			{/each}
		</ul>
	</details>
	<details>
		<summary>Debug</summary>
		<ul>
			{#each errors as error}
				<li>{error.message}</li>
			{/each}
		</ul>
	</details>
</div>

<style>
	.connection_info {
		@apply fixed border-2 border-black bottom-56 right-2 p-2 bg-gray-200 rounded-md;
	}
</style>
