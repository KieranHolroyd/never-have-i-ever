<script lang="ts">
	import type { PageData } from './$types';
	import MdiCheckCircle from '~icons/mdi/check-circle';
	import MdiAlertCircle from '~icons/mdi/alert-circle';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Verify email — games.kieran.dev</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center py-12 px-4">
	<div class="w-full max-w-sm text-center">
		{#if data.success}
			<MdiCheckCircle class="w-14 h-14 text-emerald-400 mx-auto mb-4" />
			<h1 class="text-2xl font-bold text-white mb-2">Email verified!</h1>
			<p class="text-zinc-400 text-sm mb-6">
				Your email is confirmed, {data.nickname}. You're all set.
			</p>
			<a
				href="/profile"
				class="inline-block px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
			>
				Go to profile
			</a>
		{:else}
			<MdiAlertCircle class="w-14 h-14 text-red-400 mx-auto mb-4" />
			<h1 class="text-2xl font-bold text-white mb-2">Link expired</h1>
			<p class="text-zinc-400 text-sm mb-6">
				This verification link is invalid or has already been used.
			</p>
			<a
				href="/profile"
				class="inline-block px-6 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-sm transition-colors"
			>
				Back to profile
			</a>
		{/if}
	</div>
</div>
