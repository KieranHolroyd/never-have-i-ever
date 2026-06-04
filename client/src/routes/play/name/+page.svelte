<script lang="ts">
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { ActionData, PageData } from './$types';
	import { LocalPlayer } from '$lib/player';
	import { enhance } from '$app/forms';
	import posthog from 'posthog-js';
	import SiteCard from '$lib/components/ui/SiteCard.svelte';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	type AccountUser = {
		nickname: string;
		email: string;
	};

	let { data, form }: Props = $props();

	const user = $derived((data.user as AccountUser | null | undefined) ?? null);

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

<div class="flex min-h-[60vh] items-center justify-center py-12 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div
				class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-zinc-900"
			>
				<IcRoundAccountCircle class="h-8 w-8 text-emerald-400/80" />
			</div>
			<p class="site-phase-label mb-2">Before you play</p>
			<h1 class="text-2xl font-black text-white">
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
			<SiteCard padding="md">
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
					<button type="submit" class="site-btn-primary mt-4 w-full">Update nickname</button>
				</form>

				<div class="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
					<span class="text-xs text-zinc-500">{user.email}</span>
					<form method="POST" action="/auth/logout">
						<button class="text-xs text-zinc-400 hover:text-red-400 transition-colors">
							Sign out
						</button>
					</form>
				</div>
			</SiteCard>
		{:else}
			<SiteCard padding="md">
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
				<button type="button" class="site-btn-primary mt-4 w-full" onclick={choose_nickname}>
					{LocalPlayer.name === null ? 'Set nickname' : 'Update nickname'}
				</button>
			</SiteCard>

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

