<script lang="ts">
	import '../app.css';
	import keywords from '$lib/assets/keywords.json';
	import { page } from '$app/state';
	import Settings from '$lib/components/Settings.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import { UUIDv4Regex } from '$lib/regex';
	import { LocalPlayer } from '$lib/player';
	import { browser } from '$app/environment';
	interface Props {
		children: import('svelte').Snippet;
		data: import('./$types').LayoutData;
	}

	let { children, data }: Props = $props();

	let isPlayingGame = $derived(UUIDv4Regex.test(page.url.pathname.split('/').pop() ?? ''));
	let isCahGame = $derived(page.url.pathname.includes('cards-against-humanity'));

	// Sync account nickname → localStorage so game components can read it
	$effect(() => {
		if (browser && data.user?.nickname) {
			LocalPlayer.name = data.user.nickname;
		}
	});
</script>

<svelte:head>
	<title>Games ~ Kieran.dev</title>
	<meta name="og:title" content="Games ~ Kieran.dev" />
	<meta name="twitter:title" content="Games ~ Kieran.dev" />
	<meta
		name="description"
		content="A collection* of games to play with friends (*not actually a collection yet)"
	/>
	<meta
		name="og:description"
		content="A collection* of games to play with friends (*not actually a collection yet)"
	/>
	<meta
		name="twitter:description"
		content="A collection* of games to play with friends (*not actually a collection yet)"
	/>
	<meta name="keywords" content={keywords.join(', ')} />
	<meta property="twitter:card" content="app" />
	<meta property="twitter:image" content="https://games.kieran.dev/android-chrome-512x512-gs.png" />
	<meta property="og:image" content="https://games.kieran.dev/android-chrome-512x512-gs.png" />
	<meta property="og:url" content={page.url.href} />
</svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-100">
	<Navbar />
	{#if isCahGame}
		{@render children()}
	{:else}
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
			{@render children()}
			<Footer />
		</div>
	{/if}
	<Toaster />
	<Settings />
</div>
