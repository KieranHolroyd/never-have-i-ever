<script lang="ts">
	import { Status, type Player } from '$lib/types';

	interface Props {
		connection?: Status;
		players?: Player[];
	}

	let { connection = Status.DISCONNECTED, players = [] }: Props = $props();
</script>

<div
	class="w-72 pointer-events-none mx-auto py-2 text-center uppercase text-xs rounded-b-xl panel text-slate-100"
>
	{#if connection === Status.CONNECTED}
		<p class="text-emerald-300 text-sm">
			Connected <span class="text-white">
				({players.filter((p) => p.connected).length})
			</span>
		</p>
	{:else if connection === Status.DISCONNECTED}
		<p class="text-red-300 text-sm">Disconnected</p>
	{:else}
		<p class="text-slate-300 text-sm">Connecting...</p>
	{/if}
</div>
