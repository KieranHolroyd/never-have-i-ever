<script lang="ts">
	import { version } from '$lib/version';
</script>

<footer class="mt-16 pb-10">
	<div class="site-surface flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
		<div>
			<p class="text-sm font-black text-white">Party games for everyone.</p>
			<p class="mt-1 text-xs text-white/40">Never Have I Ever · Cards Against Humanity</p>
		</div>
		<nav class="flex flex-wrap items-center gap-4 text-sm font-semibold text-white/50">
			<a href="/" class="transition hover:text-emerald-300">Home</a>
			<a href="/games" class="transition hover:text-emerald-300">Active games</a>
			<a href="/suggest" class="transition hover:text-emerald-300">Contact</a>
			<span class="font-mono text-xs text-white/30">v{version}</span>
		</nav>
	</div>
</footer>
