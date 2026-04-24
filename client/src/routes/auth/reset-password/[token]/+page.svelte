<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Reset password — games.kieran.dev</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center py-12 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<h1 class="text-2xl font-bold text-white">Choose a new password</h1>
			<p class="mt-2 text-zinc-400 text-sm">Must be at least 8 characters.</p>
		</div>

		<div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
			<form method="POST" use:enhance>
				{#if form?.error}
					<p class="text-red-400 text-sm mb-4">{form.error}</p>
				{/if}
				<div class="space-y-4">
					<div>
						<label
							class="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1.5"
							for="password"
						>
							New password
						</label>
						<input
							class="block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white
								placeholder-zinc-500 px-3 py-2.5 focus:outline-none focus:ring-2
								focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
							type="password"
							id="password"
							name="password"
							minlength={8}
							autocomplete="new-password"
							required
						/>
					</div>
					<div>
						<label
							class="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1.5"
							for="confirm"
						>
							Confirm password
						</label>
						<input
							class="block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white
								placeholder-zinc-500 px-3 py-2.5 focus:outline-none focus:ring-2
								focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
							type="password"
							id="confirm"
							name="confirm"
							minlength={8}
							autocomplete="new-password"
							required
						/>
					</div>
					<button
						type="submit"
						class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
					>
						Set new password
					</button>
				</div>
			</form>
		</div>

		<p class="mt-5 text-center text-sm text-zinc-500">
			Link expired?
			<a href="/auth/forgot-password" class="text-zinc-300 hover:text-white transition-colors">
				Request a new one
			</a>
		</p>
	</div>
</div>
