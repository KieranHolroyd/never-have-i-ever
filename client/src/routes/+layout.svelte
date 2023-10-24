<script lang="ts">
	import '../app.css';
	import keywords from '$lib/assets/keywords.json';
	import { page } from '$app/stores';
	import Settings from '$lib/components/Settings.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import { UUIDv4Regex } from '$lib/regex';
	import { version } from '$lib/version';

	$: isPlayingGame = UUIDv4Regex.test($page.url.pathname.split('/').pop() ?? '');
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
<div class="max-w-4xl mx-auto transition-all pl-16 lg:pl-0">
	<slot />
	<Settings />
	<Navbar />
	<div class={`fixed ${isPlayingGame ? 'hidden' : ''} bottom-4 text-center left-0 right-0`}>
		<span
			class="text-black dark:text-gray-300 tracking-wider text-xs rounded-full py-1 px-2 bg-gray-200/80 dark:bg-gray-600/80 backdrop-blur-sm"
		>
			v{version} • Made by
			<a href="https://kieran.dev" class="hover:text-white transition">Kieran</a>
			•
			<a href="/suggest" class="hover:text-white transition">Suggest Changes</a>
		</span>
	</div>
</div>
