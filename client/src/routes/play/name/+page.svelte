<script lang="ts">
	import { LocalPlayer } from '$lib/player';

	let nickname: string = '';
	let error: string = '';

	function choose_nickname() {
		if (nickname === '') {
			return (error = 'You need to choose a nickname!');
		}
		LocalPlayer.name = nickname;

		window.location.href = `/`;
	}
</script>

<div class="w-96 mt-10 mx-auto p-8 bg-gray-100 shadow-md">
	<h1 class="text-4xl font-bold">Hang on!</h1>
	<h2 class="text-xl font-light tracking-tight">You need to choose a nickname first!</h2>
	<label class="block w-full text-left" for="name">Nickname:</label>
	<input
		class="block w-full text-left rounded bg-gray-200 p-2 mb-2"
		type="text"
		id="name"
		name="name"
		placeholder="P. Flynn"
		bind:value={nickname}
	/>
	<button
		class="block w-full text-left text-white bg-blue-500 hover:bg-blue-600"
		on:click={choose_nickname}
	>
		Choose Nickname
	</button>
	{#if error !== ''}
		<p class="mt-2 leading-none text-xs text-red-500">{error}</p>
	{/if}
</div>
