<script lang="ts">
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { LocalPlayer } from '$lib/player';

	let nickname: string = LocalPlayer.name ?? '';
	let error: string = '';

	function choose_nickname() {
		if (nickname === '') {
			return (error = 'You need to choose a nickname!');
		}
		LocalPlayer.name = nickname;

		const redirect_url = $page.url.searchParams.get('redirect');
		if (redirect_url !== null) {
			return goto(redirect_url);
		} else {
			return goto('/play/name');
		}
	}
</script>

<div
	class="prose dark:prose-invert border-2 border-gray-200 dark:border-gray-400 min-w-[12rem] max-w-[24rem] mt-10 mx-auto p-8 dark:bg-gray-800 dark:text-white bg-gray-100 shadow-md rounded-lg"
>
	<h1 class="relative pl-12">
		<IcRoundAccountCircle
			class="absolute left-0 top-0 dark:text-white h-10 w-10"
		/>{LocalPlayer.name !== null ? `Hello ${LocalPlayer.name}` : 'Hang on!'}
	</h1>
	<p>
		{#if LocalPlayer.name === null}
			You need to choose a nickname first!
		{:else}
			You can change your nickname at any time.
		{/if}
	</p>
	<label class="block w-full text-left uppercase text-xs font-bold" for="name">Nickname:</label>
	<input
		class="block w-full text-left rounded text-black bg-gray-200 p-2 mb-2"
		type="text"
		id="name"
		name="name"
		placeholder="P. Flynn"
		bind:value={nickname}
		on:keydown={(e) => (e.key === 'Enter' ? choose_nickname() : null)}
	/>
	<button
		class="block w-full text-left text-white bg-blue-500 hover:bg-blue-600"
		on:click={choose_nickname}
	>
		Confirm Selection
	</button>
	{#if error !== ''}
		<p class="mt-2 leading-none text-xs text-red-500">{error}</p>
	{/if}
</div>
