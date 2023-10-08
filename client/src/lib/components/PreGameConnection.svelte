<script lang="ts">
	import { Status, type Player } from '$lib/types';

	export let connection: Status = Status.DISCONNECTED;
	export let players: Player[] = [];
</script>

<div class="text-center uppercase text-xs">
	{#if connection === Status.CONNECTED}
		<p class="dark:text-green-400 text-green-700">
			Connected <span class="dark:text-white text-black">
				({players.filter((p) => p.connected).length})
			</span>
		</p>
	{:else if connection === Status.DISCONNECTED}
		<p class="dark:text-red-400 text-red-700">Disconnected</p>
	{:else}
		<p class="dark:text-gray-400 text-gray-700">Connecting...</p>
	{/if}
</div>
