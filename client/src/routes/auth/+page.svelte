<script lang="ts">
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';

	type ActionData = { action?: 'register' | 'login'; error?: string } | null;

	let { form }: { form: ActionData } = $props();

	let tab: 'login' | 'register' = $state('login');

	const redirect = $derived(page.url.searchParams.get('redirect') ?? '');
</script>

<div class="min-h-[60vh] flex items-center justify-center py-12 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800 mb-4">
				<IcRoundAccountCircle class="h-8 w-8 text-zinc-300" />
			</div>
			<h1 class="text-2xl font-bold text-white">
				{tab === 'login' ? 'Sign in' : 'Create account'}
			</h1>
			<p class="mt-2 text-zinc-400 text-sm">
				{tab === 'login'
					? 'Sign in to keep your nickname across devices.'
					: 'Pick a nickname that follows you everywhere.'}
			</p>
		</div>

		<!-- Tab switcher -->
		<div class="flex rounded-xl bg-zinc-800/60 p-1 mb-6 gap-1">
			<button
				type="button"
				class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
					{tab === 'login' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}"
				onclick={() => (tab = 'login')}
			>
				Sign in
			</button>
			<button
				type="button"
				class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
					{tab === 'register' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}"
				onclick={() => (tab = 'register')}
			>
				Sign up
			</button>
		</div>

		<div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
			{#if tab === 'login'}
				<form method="POST" action="?/login" use:enhance>
					{#if redirect}
						<input type="hidden" name="redirect" value={redirect} />
					{/if}

					<div class="space-y-4">
						<div>
							<label
								class="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1.5"
								for="login-email"
							>
								Email
							</label>
							<input
								class="block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white
									placeholder-zinc-500 px-3 py-2.5 focus:outline-none focus:ring-2
									focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
								type="email"
								id="login-email"
								name="email"
								placeholder="you@example.com"
								autocomplete="email"
								required
							/>
						</div>

						<div>
							<label
								class="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1.5"
								for="login-password"
							>
								Password
							</label>
							<input
								class="block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white
									placeholder-zinc-500 px-3 py-2.5 focus:outline-none focus:ring-2
									focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
								type="password"
								id="login-password"
								name="password"
								placeholder="••••••••"
								autocomplete="current-password"
								required
							/>
						</div>
					</div>

					{#if form?.action === 'login' && form.error}
						<p class="mt-3 text-xs text-red-400">{form.error}</p>
					{/if}

					<button
						class="mt-5 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600
							px-4 py-2.5 text-white font-semibold text-sm transition-colors
							focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
					>
						Sign in
					</button>
				</form>
			{:else}
				<form method="POST" action="?/register" use:enhance>
					{#if redirect}
						<input type="hidden" name="redirect" value={redirect} />
					{/if}

					<div class="space-y-4">
						<div>
							<label
								class="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1.5"
								for="reg-nickname"
							>
								Nickname
							</label>
							<input
								class="block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white
									placeholder-zinc-500 px-3 py-2.5 focus:outline-none focus:ring-2
									focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
								type="text"
								id="reg-nickname"
								name="nickname"
								placeholder="e.g. P. Flynn"
								autocomplete="nickname"
								maxlength="30"
								required
							/>
						</div>

						<div>
							<label
								class="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1.5"
								for="reg-email"
							>
								Email
							</label>
							<input
								class="block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white
									placeholder-zinc-500 px-3 py-2.5 focus:outline-none focus:ring-2
									focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
								type="email"
								id="reg-email"
								name="email"
								placeholder="you@example.com"
								autocomplete="email"
								required
							/>
						</div>

						<div>
							<label
								class="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1.5"
								for="reg-password"
							>
								Password
							</label>
							<input
								class="block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white
									placeholder-zinc-500 px-3 py-2.5 focus:outline-none focus:ring-2
									focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
								type="password"
								id="reg-password"
								name="password"
								placeholder="Min. 8 characters"
								autocomplete="new-password"
								minlength="8"
								required
							/>
						</div>
					</div>

					{#if form?.action === 'register' && form.error}
						<p class="mt-3 text-xs text-red-400">{form.error}</p>
					{/if}

					<button
						class="mt-5 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600
							px-4 py-2.5 text-white font-semibold text-sm transition-colors
							focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
					>
						Create account
					</button>
				</form>
			{/if}
		</div>

		<p class="mt-4 text-center text-sm text-zinc-500">
			<!-- svelte-ignore a11y_invalid_attribute -->
			<a href="/play/name" class="text-zinc-400 hover:text-white transition-colors">
				← Continue as guest instead
			</a>
		</p>
	</div>
</div>
