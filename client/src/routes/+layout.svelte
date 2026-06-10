<script lang="ts">
	import '../app.css';
	import keywords from '$lib/assets/keywords.json';
	import { page } from '$app/state';
	import Settings from '$lib/components/Settings.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import { LocalPlayer } from '$lib/player';
	import { browser } from '$app/environment';
	import { initSettings, clearAccountSettingsSync } from '$lib/settings';

	interface Props {
		children: import('svelte').Snippet;
		data: import('./$types').LayoutData;
	}

	let { children, data }: Props = $props();

	let settingsOpen = $state(false);

	const isGameRoute = $derived(
		page.url.pathname.includes('/play/') &&
			(page.url.pathname.includes('never-have-i-ever') ||
				page.url.pathname.includes('cards-against-humanity'))
	);

	const siteDescription =
		'Play Never Have I Ever and Cards Against Humanity online with friends. No install — share a link and start.';

	$effect(() => {
		if (browser && data.user?.nickname) {
			LocalPlayer.name = data.user.nickname;
		}
	});

	$effect(() => {
		if (!browser) return;
		initSettings(data.preferences, data.user);
		return () => {
			if (!data.user) clearAccountSettingsSync();
		};
	});
</script>

<svelte:head>
	<title>Games ~ Kieran.dev</title>
	<meta name="og:title" content="Games ~ Kieran.dev" />
	<meta name="twitter:title" content="Games ~ Kieran.dev" />
	<meta name="description" content={siteDescription} />
	<meta name="og:description" content={siteDescription} />
	<meta name="twitter:description" content={siteDescription} />
	<meta name="keywords" content={keywords.join(', ')} />
	<meta property="twitter:card" content="app" />
	<meta property="twitter:image" content="https://games.kieran.dev/android-chrome-512x512-gs.png" />
	<meta property="og:image" content="https://games.kieran.dev/android-chrome-512x512-gs.png" />
	<meta property="og:url" content={page.url.href} />
</svelte:head>

<div class="bg-background text-foreground relative flex min-h-screen flex-col">
	<Navbar compact={isGameRoute} bind:settingsOpen />

	{#if isGameRoute}
		<div class="flex flex-1 flex-col">
			{@render children()}
		</div>
	{:else}
		<div class="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
			<main class="flex-1">
				{@render children()}
			</main>
			<Footer />
		</div>
	{/if}

	<Toaster />
	<Settings bind:show={settingsOpen} embedded />
</div>
