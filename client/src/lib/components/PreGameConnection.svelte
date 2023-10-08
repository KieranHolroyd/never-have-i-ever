<script lang="ts">
	import { Status, type Player } from '$lib/types';

	export let connection: Status = Status.DISCONNECTED;
	export let players: Player[] = [];
</script>

<div class="text-center">
	{#if connection === Status.CONNECTED}
		<p class="text-green-700">
			Connected <span class="dark:text-white text-black">
				({players.filter((p) => p.connected).length})
			</span>
		</p>
	{:else if connection === Status.DISCONNECTED}
		<p class="text-red-700">Disconnected</p>
	{:else}
		<p class="text-red-700">Connecting...</p>
	{/if}
</div>
