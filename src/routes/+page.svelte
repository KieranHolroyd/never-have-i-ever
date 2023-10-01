<script>
	const name = 'Never have I ever';
	import NeverHaveIEver from '$lib/components/Game.svelte';
</script>

<div>
	<h1
		class="font-bold text-center text-2xl tracking-tight uppercase py-2 bg-slate-400 bg-opacity-30 backdrop-blur-sm"
	>
		{name}
	</h1>
	<hr />
	<NeverHaveIEver />
	<p class="text-gray-300 text-sm font-bold tracking-wider">
		Made by Kieran.
		<a href="/suggest">Suggest Changes.</a>
	</p>
</div>
