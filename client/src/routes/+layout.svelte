<script>
	import '../app.css';
	import keywords from '$lib/assets/keywords.json';
</script>

<svelte:head>
	<title>Games ~ Kieran.dev</title>
	<meta
		name="description"
		content="A collection* of games to play with friends (*not actually a collection yet)"
	/>
	<meta name="keywords" content={keywords.join(', ')} />
</svelte:head>
<div class="max-w-4xl mx-auto">
	<slot />
</div>
