<script lang="ts">
	import { version } from '$lib/version';
</script>

<footer class="mt-10 pb-8 text-center text-slate-300">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
		<div
			class="inline-flex items-center gap-4 rounded-full border border-slate-700/70 bg-slate-800/50 backdrop-blur-sm px-4 py-2 text-sm"
		>
			<span>v{version}</span>
			<span class="opacity-60">•</span>
			<a href="/" class="hover:text-white">Home</a>
			<span class="opacity-60">•</span>
			<a href="/suggest" class="hover:text-white">Contact</a>
		</div>
	</div>
</footer>
