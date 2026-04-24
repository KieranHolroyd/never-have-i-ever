<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Forgot password — games.kieran.dev</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center py-12 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<h1 class="text-2xl font-bold text-white">Forgot password?</h1>
			<p class="mt-2 text-zinc-400 text-sm">
				Enter your email and we'll send you a reset link.
			</p>
		</div>

		<div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
			{#if form?.success}
				<div class="text-center py-2">
					<p class="text-emerald-400 font-medium">Check your inbox!</p>
					<p class="text-zinc-400 text-sm mt-2">
						If an account exists for that email, we've sent a password reset link. It expires in 1
						hour.
					</p>
				</div>
			{:else}
				<form method="POST" use:enhance>
					{#if form?.error}
						<p class="text-red-400 text-sm mb-4">{form.error}</p>
					{/if}
					<div class="space-y-4">
						<div>
							<label
								class="block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1.5"
								for="email"
							>
								Email
							</label>
							<input
								class="block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white
									placeholder-zinc-500 px-3 py-2.5 focus:outline-none focus:ring-2
									focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
								type="email"
								id="email"
								name="email"
								placeholder="you@example.com"
								autocomplete="email"
								required
							/>
						</div>
						<button
							type="submit"
							class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
						>
							Send reset link
						</button>
					</div>
				</form>
			{/if}
		</div>

		<p class="mt-5 text-center text-sm text-zinc-500">
			<a href="/auth" class="text-zinc-300 hover:text-white transition-colors">Back to sign in</a>
		</p>
	</div>
</div>
