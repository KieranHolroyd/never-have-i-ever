<script lang="ts">
	import { version } from '$lib/version';
</script>

<footer class="mt-16 pb-10 border-t border-zinc-800/50 pt-6">
	<div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-zinc-500">
		<span class="font-mono text-xs tracking-tight">v{version}</span>
		<nav class="flex items-center gap-5">
			<a href="/" class="hover:text-zinc-200 transition-colors">Home</a>
			<a href="/suggest" class="hover:text-zinc-200 transition-colors">Contact</a>
		</nav>
	</div>
</footer>
