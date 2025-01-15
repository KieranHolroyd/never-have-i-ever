<script lang="ts">
	import { page } from '$app/stores';
	import NeverHaveIEver from '$lib/components/never-have-i-ever/Game.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<svelte:head>
	<title>
		{data.game?.active ? '[LIVE]' : ''} Play Cards Against Humanity Online
	</title>
	<meta
		property="og:title"
		content="{data.game?.active ? '[LIVE]' : ''} Play Cards Against Humanity Online"
	/>
	<meta
		property="twitter:title"
		content="{data.game?.active ? '[LIVE]' : ''} Play Cards Against Humanity Online"
	/>
	{#if data.game?.active}
		<meta
			name="description"
			content="Join {data.game?.players
				?.filter((p) => p.connected)
				.map((p) => p.name)
				?.join(', ')} playing cards against humanity online!"
		/>
		<meta
			name="og:description"
			content="Join {data.game?.players
				?.filter((p) => p.connected)
				.map((p) => p.name)
				?.join(', ')} playing cards against humanity online!"
		/>
		<meta
			property="twitter:description"
			content="Join {data.game?.players
				?.filter((p) => p.connected)
				.map((p) => p.name)
				?.join(', ')} playing cards against humanity online!"
		/>
		<meta property="og:type" content="website" />
		<meta property="og:site_name" content="Cards Against Humanity ~ games.kieran.dev" />
		<meta property="twitter:image" content="https://games.kieran.dev/android-chrome-512x512.png" />
		<meta property="og:image" content="https://games.kieran.dev/android-chrome-512x512.png" />
	{/if}
</svelte:head>
<!-- <NeverHaveIEver id={$page.params.gameid} catagories={data.catagories} /> -->
<div>
	<h1>Cards Against Humanity</h1>
</div>
