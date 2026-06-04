<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		padding?: 'none' | 'sm' | 'md' | 'lg';
		heading?: string;
		label?: string;
		children?: Snippet;
	}

	let { class: className = '', padding = 'md', heading, label, children }: Props = $props();

	const padClass = $derived(
		(
			{
				none: '',
				sm: 'p-4',
				md: 'p-5 sm:p-6',
				lg: 'p-6 sm:p-8'
			} as const
		)[padding]
	);
</script>

<div class="site-surface {padClass} {className}">
	{#if label}
		<p class="site-phase-label mb-2">{label}</p>
	{/if}
	{#if heading}
		<h2 class="text-xl font-black text-white sm:text-2xl">{heading}</h2>
	{/if}
	{@render children?.()}
</div>
