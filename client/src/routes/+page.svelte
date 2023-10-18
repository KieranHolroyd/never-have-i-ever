<script lang="ts">
	import { goto } from '$app/navigation';

	import MdiInformation from '~icons/mdi/information';
	import MdiGamepadSquare from '~icons/mdi/gamepad-square';
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
		<div
			class="relative border-2 border-gray-200 dark:border-gray-400 px-2 py-4 pb-20 rounded-lg dark:text-gray-300 dark:bg-gray-900 bg-gray-200"
		>
			<span class="absolute top-4 left-3">
				<MdiInformation class="w-8 h-8" />
			</span>
			<p class="text-justify pl-11 pr-4">
				Dive into a virtual realm of cheeky confessions with our real-time online game of Never Have
				I Ever. Discover amusing truths in a laughter-filled atmosphere, whether with close friends
				or new acquaintances. Experience a seamless gaming journey as you venture through rounds of
				startling revelations and playful exchanges. Unmask amusing secrets and forge unforgettable
				memories in this classic party game gone virtual!
			</p>
			<div class="absolute bottom-4 right-4">
				<button class="relative pl-12 p-4 menu-button" on:click={startGame}>
					<MdiGamepadSquare class="absolute left-4 top-2 h-10 w-6" /> Start New Game
				</button>
			</div>
		</div>
	</div>

	<p
		class="fixed pb-4 bottom-0 right-0 left-0 text-center text-gray-600 dark:text-gray-300 text-sm font-bold tracking-wider"
	>
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
		@apply bg-green-500 text-white rounded-md shadow-md;
		@apply mt-4 cursor-pointer transition ease-in-out duration-200;
	}
	.menu-button:hover {
		@apply bg-green-400;
	}
</style>
