<script lang="ts">
	import { page } from '$app/stores';
	import NeverHaveIEver from '$lib/components/Game.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>
		{data.game?.active ? '[LIVE]' : ''} Play Never Have I Ever Online
	</title>
	<meta
		property="og:title"
		content="{data.game?.active ? '[LIVE]' : ''} Play Never Have I Ever Online"
	/>
	<meta
		property="twitter:title"
		content="{data.game?.active ? '[LIVE]' : ''} Play Never Have I Ever Online"
	/>
	{#if data.game?.active}
		<meta
			name="description"
			content="Join {data.game?.players
				?.filter((p) => p.connected)
				.map((p) => p.name)
				?.join(', ')} playing never have i ever online!"
		/>
		<meta
			name="og:description"
			content="Join {data.game?.players
				?.filter((p) => p.connected)
				.map((p) => p.name)
				?.join(', ')} playing never have i ever online!"
		/>
		<meta
			property="twitter:description"
			content="Join {data.game?.players
				?.filter((p) => p.connected)
				.map((p) => p.name)
				?.join(', ')} playing never have i ever online!"
		/>
		<meta property="og:type" content="website" />
		<meta property="og:site_name" content="Never Have I Ever ~ games.kieran.dev" />
		<meta property="twitter:image" content="https://games.kieran.dev/android-chrome-512x512.png" />
		<meta property="og:image" content="https://games.kieran.dev/android-chrome-512x512.png" />
	{/if}
</svelte:head>
<NeverHaveIEver id={$page.params.gameid} />
