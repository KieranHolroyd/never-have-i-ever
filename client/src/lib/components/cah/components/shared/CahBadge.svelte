<script lang="ts">
	interface Props {
		variant?: 'judge' | 'current-user' | 'your-turn' | 'ready' | 'waiting' | 'info';
		size?: 'sm' | 'md';
		children: any;
		showIcon?: boolean;
	}

	let {
		variant = 'info',
		size = 'sm',
		children,
		showIcon = false
	}: Props = $props();

	const variantClasses = {
		judge: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
		'current-user': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
		'your-turn': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
		ready: 'bg-green-500/20 text-green-400 border-green-400/30',
		waiting: 'bg-amber-500/20 text-amber-400 border-amber-400/30',
		info: 'bg-slate-500/20 text-slate-400 border-slate-400/30'
	};

	const sizeClasses = {
		sm: 'px-2 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm'
	};

	function getIcon(variant: string) {
		switch (variant) {
			case 'judge': return 'star';
			case 'your-turn': return 'check-circle';
			case 'ready': return 'check';
			case 'waiting': return 'clock';
			default: return null;
		}
	}
</script>

<div class="inline-flex items-center gap-1.5 {sizeClasses[size]} {variantClasses[variant]} rounded-full border font-medium">
	{#if showIcon}
		{#if variant === 'judge'}
			<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
				<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
			</svg>
		{:else if variant === 'your-turn'}
			<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
			</svg>
		{:else if variant === 'ready'}
			<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 101.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
			</svg>
		{:else if variant === 'waiting'}
			<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd"/>
			</svg>
		{/if}
	{/if}
	<span>{@render children()}</span>
</div>