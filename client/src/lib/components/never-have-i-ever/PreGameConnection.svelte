<script lang="ts">
	import { Status, type Player } from '$lib/types';

	interface Props {
		connection?: Status;
		players?: Player[];
	}

	let { connection = Status.DISCONNECTED, players = [] }: Props = $props();
</script>

<div
	class="w-72 pointer-events-none mx-auto py-2 text-center uppercase text-xs rounded-b-xl panel text-zinc-200"
>
	{#if connection === Status.CONNECTED}
		<p class="text-emerald-400 text-sm">
			Connected <span class="text-zinc-300">
				({players.filter((p) => p.connected).length})
			</span>
		</p>
	{:else if connection === Status.DISCONNECTED}
		<p class="text-red-400 text-sm">Disconnected</p>
	{:else}
		<p class="text-zinc-400 text-sm">Connecting...</p>
	{/if}
</div>
