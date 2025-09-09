<script lang="ts">
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { LocalPlayer } from '$lib/player';

	let nickname: string = $state(LocalPlayer.name ?? '');
	let error: string = $state('');

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

<div class="max-w-md mx-auto mt-10">
	<div class="rounded-2xl border border-slate-700/70 bg-slate-800/50 backdrop-blur-sm shadow-xl ring-1 ring-white/5 p-6">
		<h1 class="relative pl-12 text-xl font-bold">
			<IcRoundAccountCircle class="absolute left-0 top-[-2px] text-white h-10 w-10" />
			{LocalPlayer.name !== null ? `Hello ${LocalPlayer.name}` : 'Choose your nickname'}
		</h1>
		<p class="mt-2 text-slate-300 text-sm">
			{#if LocalPlayer.name === null}
				You need to choose a nickname first!
			{:else}
				You can change your nickname at any time.
			{/if}
		</p>
		<label class="block w-full text-left uppercase text-xs font-bold mt-4 mb-1" for="name">Nickname</label>
		<input
			class="block w-full rounded-md text-slate-900 bg-slate-100 placeholder-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
			type="text"
			id="name"
			name="name"
			placeholder="P. Flynn"
			bind:value={nickname}
			onkeydown={(e) => (e.key === 'Enter' ? choose_nickname() : null)}
		/>
		<button
			class="mt-4 w-full inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-white font-semibold shadow hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
			onclick={choose_nickname}
		>
			Confirm Selection
		</button>
		{#if error !== ''}
			<p class="mt-2 leading-none text-xs text-red-400">{error}</p>
		{/if}
	</div>
</div>
