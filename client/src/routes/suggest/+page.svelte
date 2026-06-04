<script lang="ts">
	import MdiEmailOutline from '~icons/mdi/email-outline';
	import MdiArrowLeft from '~icons/mdi/arrow-left';
	import SiteCard from '$lib/components/ui/SiteCard.svelte';
	import SiteButton from '$lib/components/ui/SiteButton.svelte';
</script>

<div class="flex min-h-[60vh] items-start justify-center py-12 px-4">
	<div class="w-full max-w-lg">
		<a
			href="/"
			class="mb-8 inline-flex items-center gap-1.5 text-sm text-white/45 transition hover:text-emerald-300"
		>
			<MdiArrowLeft class="h-4 w-4" />
			Back to games
		</a>

		<p class="site-phase-label mb-2">Contact</p>
		<h1 class="mb-2 text-3xl font-black text-white">Get in touch</h1>
		<p class="mb-8 text-white/45">Questions, bug reports, or game suggestions — we want to hear them.</p>

		<SiteCard padding="lg">
			<div class="flex items-center gap-4 border-b border-white/8 pb-6">
				<span
					class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"
				>
					<MdiEmailOutline class="h-5 w-5" />
				</span>
				<div>
					<p class="text-xs text-white/40">Email us directly</p>
					<a
						href="mailto:games@kieran.dev"
						class="font-semibold text-white transition hover:text-emerald-400"
					>
						games@kieran.dev
					</a>
				</div>
			</div>

			<button
				type="button"
				class="open-feedback site-btn-primary mt-6 w-full"
			>
				Send feedback
			</button>
		</SiteCard>
	</div>
</div>
