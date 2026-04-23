<script lang="ts">
	import MdiEmailOutline from '~icons/mdi/email-outline';
	import MdiArrowLeft from '~icons/mdi/arrow-left';
</script>

<div class="min-h-[60vh] flex items-start justify-center py-12 px-4">
	<div class="w-full max-w-lg">
		<a
			href="/"
			class="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors mb-8"
		>
			<MdiArrowLeft class="h-4 w-4" />
			Back to games
		</a>

		<h1 class="text-3xl font-bold text-white mb-2">Get in touch</h1>
		<p class="text-zinc-400 mb-8">Questions, bug reports, or game suggestions — we want to hear them.</p>

		<div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
			<div class="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-800">
				<span
					class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0"
				>
					<MdiEmailOutline class="h-5 w-5" />
				</span>
				<div>
					<p class="text-xs text-zinc-400 mb-0.5">Email us directly</p>
					<a
						href="mailto:games@kieran.dev"
						class="text-white font-semibold hover:text-emerald-400 transition-colors"
					>
						games@kieran.dev
					</a>
				</div>
			</div>

			<button
				class="open-feedback w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5
					text-white font-semibold text-sm transition-colors
					focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
			>
				Open feedback form
			</button>
		</div>
	</div>
</div>
