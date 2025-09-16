<script lang="ts">
	import '../app.css';
	import keywords from '$lib/assets/keywords.json';
	import { page } from '$app/stores';
	import Settings from '$lib/components/Settings.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import { UUIDv4Regex } from '$lib/regex';
	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let isPlayingGame = $derived(UUIDv4Regex.test($page.url.pathname.split('/').pop() ?? ''));
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
	<meta property="og:url" content={$page.url.href} />
</svelte:head>

<!-- Global background + container -->
<div class="min-h-screen bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all pl-16 lg:pl-0">
		{@render children()}
		<Toaster />
		<Settings />
		<Navbar />
		<Footer />
	</div>
</div>
