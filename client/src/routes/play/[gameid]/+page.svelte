<script lang="ts">
	import { page } from '$app/stores';
	import NeverHaveIEver from '$lib/components/Game.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<title>
	{data.game?.active ? '[LIVE]' : ''} Play Never Have I Ever Online
</title>
{#if data.game?.active}
	<meta
		name="description"
		content="Join {data.game?.players
			?.filter((p) => p.connected)
			.map((p) => p.name)
			?.join(', ')} playing never have i ever online!"
	/>
{/if}
<NeverHaveIEver id={$page.params.gameid} />
