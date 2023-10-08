<script lang="ts">
	import { goto } from '$app/navigation';
	import InfoIcon from '$lib/components/icon/InfoIcon.svelte';
	import { LocalPlayer } from '$lib/player';
	import type { PageData } from './$types';

	export let data: PageData;

	function startGame() {
		if (LocalPlayer.name === null) {
			return goto(`/play/name?redirect=/play/${data.newgame_id}`);
		}
		goto(`/play/${data.newgame_id}`);
	}
</script>

<div>
	<div class="menu-container">
		<h1 class="text-3xl dark:text-white font-bold mb-4">Never Have I Ever</h1>
		<div class="relative px-2 py-4 rounded-lg dark:text-gray-300 dark:bg-gray-900 bg-gray-200">
			<span class="absolute top-4 left-2">
				<InfoIcon />
			</span>
			<p class="text-justify pl-14 pr-4">
				Dive into a virtual realm of cheeky confessions with our real-time online game of Never Have
				I Ever. Discover amusing truths in a laughter-filled atmosphere, whether with close friends
				or new acquaintances. Experience a seamless gaming journey as you venture through rounds of
				startling revelations and playful exchanges. Unmask amusing secrets and forge unforgettable
				memories in this classic party game gone virtual!
			</p>
		</div>
		<button class="menu-button" on:click={startGame}> Start New Game </button>
	</div>

	<p class="text-center text-gray-300 text-sm font-bold tracking-wider">
		Made by <a href="https://kieran.dev">Kieran</a>.
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
