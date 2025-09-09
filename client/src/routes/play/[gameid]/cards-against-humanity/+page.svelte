<script lang="ts">
	import { page } from '$app/stores';
	import CardsAgainstHumanity from '$lib/components/cards-against-humanity/Game.svelte';
	import CardPackSelection from '$lib/components/cards-against-humanity/CardPackSelection.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Game state management
	let gameStarted: boolean = $state(false);
	let selectedPackIds: string[] = $state([]);

	function handlePacksSelected(packs: string[]) {
		selectedPackIds = packs;
		gameStarted = true;
		// TODO: Send selected packs to server/game engine
		console.log('Selected packs:', selectedPackIds);
	}
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
{#if gameStarted}
	<CardsAgainstHumanity id={$page.params.gameid as string} {selectedPackIds} />
{:else}
	<CardPackSelection gameId={$page.params.gameid as string} onPacksSelected={handlePacksSelected} />
{/if}
