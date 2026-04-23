<script lang="ts">
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { LocalPlayer } from '$lib/player';
	import { enhance } from '$app/forms';
	import posthog from 'posthog-js';

	let { data, form } = $props();

	const user = $derived(data.user ?? null);

	// If user is signed in, seed the local nickname from their account on first visit
	$effect(() => {
		if (user && !LocalPlayer.name) {
			LocalPlayer.name = user.nickname;
		}
	});

	let nickname: string = $state('');

	$effect(() => {
		nickname = user?.nickname ?? LocalPlayer.name ?? '';
	});
	let error: string = $state('');

	const redirect_url = $derived(page.url.searchParams.get('redirect'));

	function choose_nickname() {
		if (nickname === '') {
			return (error = 'You need to choose a nickname!');
		}
		const isNew = LocalPlayer.name === null;
		LocalPlayer.name = nickname;

		posthog.identify(LocalPlayer.id, { nickname });
		posthog.capture('nickname_set', { is_new: isNew });

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
				{user ? `Hey, ${user.nickname}` : (LocalPlayer.name !== null ? `Hey, ${LocalPlayer.name}` : 'Choose a nickname')}
			</h1>
			<p class="mt-2 text-zinc-400 text-sm">
				{user
					? 'Your nickname is saved to your account.'
					: LocalPlayer.name === null
						? 'Pick a name before you jump in.'
						: 'You can update your nickname at any time.'}
			</p>
		</div>

		{#if user}
			<!-- Signed-in: update nickname via server action -->
			<div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
				<form method="POST" action="?/updateNickname" use:enhance={() => {
					return ({ result }) => {
						if (result.type === 'success') {
							nickname = (result.data as { success: boolean })?.success ? nickname : nickname;
							if (redirect_url) goto(redirect_url);
						}
					};
				}}>
					<label
						class="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2"
						for="name"
					>
						Nickname
					</label>
					<input
						class="block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500
							px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
						type="text"
						id="name"
						name="nickname"
						placeholder="e.g. P. Flynn"
						bind:value={nickname}
						maxlength="30"
					/>
					{#if form?.error}
						<p class="mt-2 text-xs text-red-400">{form.error}</p>
					{/if}
					<button
						class="mt-4 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600
							px-4 py-2.5 text-white font-semibold text-sm transition-colors
							focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
					>
						Update nickname
					</button>
				</form>

				<div class="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
					<span class="text-xs text-zinc-500">{user.email}</span>
					<form method="POST" action="/auth/logout">
						<button class="text-xs text-zinc-400 hover:text-red-400 transition-colors">
							Sign out
						</button>
					</form>
				</div>
			</div>
		{:else}
			<!-- Guest: local nickname -->
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

			<p class="mt-4 text-center text-sm text-zinc-500">
				or
				<a
					href="/auth{redirect_url ? `?redirect=${encodeURIComponent(redirect_url)}` : ''}"
					class="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
				>
					sign in / create account
				</a>
				to save your nickname
			</p>
		{/if}
	</div>
</div>

