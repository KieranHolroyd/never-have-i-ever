<script lang="ts">
	import { Status, type Player } from '$lib/types';

	export let connection: Status = Status.DISCONNECTED;
	export let players: Player[] = [];
	export let errors: any[] = [];
</script>

<div class="connection_info">
	<details>
		<summary class="cursor-pointer">
			{#if connection === Status.CONNECTING}
				Connecting...
			{:else if connection === Status.CONNECTED}
				Connected
			{:else if connection === Status.DISCONNECTED}
				Disconnected
			{/if}
		</summary>
		<ul>
			{#each players as player}
				<li class={`${!player.connected ? 'line-through text-gray-400' : ''}`}>
					{player.name}
					{#if player.connected}({player.score}){/if}
				</li>
			{/each}
		</ul>
		<details>
			<summary class="cursor-pointer">Debug</summary>
			<ul>
				{#each errors as error}
					<li>{error.message}</li>
				{/each}
			</ul>
		</details>
	</details>
</div>

<style lang="scss">
	.connection_info {
		@apply fixed border-2 dark:border-white border-black top-2 right-2 p-2 dark:bg-gray-600 bg-gray-200 rounded-md;
	}
</style>
