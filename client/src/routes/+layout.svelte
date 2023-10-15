<script>
	import '../app.css';
	import keywords from '$lib/assets/keywords.json';
	import { page } from '$app/stores';
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
<div class="max-w-4xl mx-auto">
	<slot />
</div>
