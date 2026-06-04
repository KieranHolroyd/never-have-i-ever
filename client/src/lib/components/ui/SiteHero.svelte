<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label?: string;
		title: string;
		subtitle?: string;
		class?: string;
		stats?: Snippet;
		actions?: Snippet;
	}

	let { label, title, subtitle, class: className = '', stats, actions }: Props = $props();
</script>

<section class="site-hero {className}">
	<div class="site-hero-glow" aria-hidden="true"></div>
	<div class="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
		<div>
			{#if label}
				<p class="site-phase-label text-emerald-300/80">{label}</p>
			{/if}
			<h1 class="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
				{title}
			</h1>
			{#if subtitle}
				<p class="mt-4 max-w-2xl text-sm leading-relaxed text-white/45 sm:text-base">{subtitle}</p>
			{/if}
			{#if actions}
				<div class="mt-6 flex flex-wrap gap-3">
					{@render actions()}
				</div>
			{/if}
		</div>
		{#if stats}
			<div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
				{@render stats()}
			</div>
		{/if}
	</div>
</section>
