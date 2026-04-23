<script lang="ts">
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { LocalPlayer } from '$lib/player';
	import posthog from 'posthog-js';

	let nickname: string = $state(LocalPlayer.name ?? '');
	let error: string = $state('');

	function choose_nickname() {
		if (nickname === '') {
			return (error = 'You need to choose a nickname!');
		}
		const isNew = LocalPlayer.name === null;
		LocalPlayer.name = nickname;

		posthog.identify(LocalPlayer.id, { nickname });
		posthog.capture('nickname_set', { is_new: isNew });

		const redirect_url = page.url.searchParams.get('redirect');
		if (redirect_url !== null) {
			return goto(redirect_url);
		} else {
			return goto('/play/name');
		}
	}
</script>

<div class="min-h-[60vh] flex items-center justify-center py-12 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div
				class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800 mb-4"
			>
				<IcRoundAccountCircle class="h-8 w-8 text-zinc-300" />
			</div>
			<h1 class="text-2xl font-bold text-white">
				{LocalPlayer.name !== null ? `Hey, ${LocalPlayer.name}` : 'Choose a nickname'}
			</h1>
			<p class="mt-2 text-zinc-400 text-sm">
				{LocalPlayer.name === null
					? 'Pick a name before you jump in.'
					: 'You can update your nickname at any time.'}
			</p>
		</div>

		<div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
			<label class="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2" for="name">
				Nickname
			</label>
			<input
				class="block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500
					px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
				type="text"
				id="name"
				name="name"
				placeholder="e.g. P. Flynn"
				bind:value={nickname}
				onkeydown={(e) => (e.key === 'Enter' ? choose_nickname() : null)}
			/>
			{#if error !== ''}
				<p class="mt-2 text-xs text-red-400">{error}</p>
			{/if}
			<button
				class="mt-4 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600
					px-4 py-2.5 text-white font-semibold text-sm transition-colors
					focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
				onclick={choose_nickname}
			>
				{LocalPlayer.name === null ? 'Set nickname' : 'Update nickname'}
			</button>
		</div>
	</div>
</div>
