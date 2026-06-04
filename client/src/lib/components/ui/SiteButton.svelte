<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

	interface Props {
		variant?: Variant;
		type?: 'button' | 'submit';
		disabled?: boolean;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		href?: string;
		fullWidth?: boolean;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		type = 'button',
		disabled = false,
		class: className = '',
		onclick,
		href,
		fullWidth = false,
		children
	}: Props = $props();

	const variantClass: Record<Variant, string> = {
		primary: 'site-btn-primary',
		secondary: 'site-btn-secondary',
		ghost: 'site-btn-ghost',
		danger: 'site-btn-danger'
	};

	const base = $derived(`${variantClass[variant]} ${fullWidth ? 'w-full' : ''} ${className}`);
</script>

{#if href}
	<a {href} class={base}>
		{@render children?.()}
	</a>
{:else}
	<button {type} class={base} {disabled} {onclick}>
		{@render children?.()}
	</button>
{/if}
