<script lang="ts">
	import { goto } from '$app/navigation';
	import { LocalPlayer } from '$lib/player';
	import type { PageData } from './$types';

	export let data: PageData;
	const name = 'Never have I ever';

	function startGame() {
		if (LocalPlayer.name === null) {
			return goto(`/play/name?redirect=/play/${data.newgame_id}`);
		}
		goto(`/play/${data.newgame_id}`);
	}
</script>

<div>
	<div class="menu-container">
		<h1 class="text-3xl dark:text-white font-bold mb-4">{name}</h1>
		<button class="menu-button" on:click={startGame}> Start New Game </button>
	</div>

	<p class="text-center text-gray-300 text-sm font-bold tracking-wider">
		Made by Kieran.
		<a href="/suggest">Suggest Changes.</a>
	</p>
</div>

<style>
	.menu-container {
		@apply p-10 text-gray-800 rounded-md;
		@apply flex flex-col items-center justify-center;
	}
	.menu-button {
		@apply p-4 bg-green-500 text-white rounded-md shadow-md;
		@apply mt-4 cursor-pointer transition ease-in-out duration-200;
	}
	.menu-button:hover {
		@apply bg-green-400;
	}
</style>
