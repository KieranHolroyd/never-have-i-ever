<script lang="ts">
	interface Props {
		value: number;
		max?: number;
		label?: string;
		size?: 'sm' | 'md';
		variant?: 'default' | 'gradient' | 'animated';
	}

	let {
		value,
		max = 100,
		label,
		size = 'md',
		variant = 'default'
	}: Props = $props();

	const percentage = Math.min((value / max) * 100, 100);

	const sizeClasses = {
		sm: 'h-2',
		md: 'h-3'
	};

	const variantClasses = {
		default: 'bg-blue-500',
		gradient: 'bg-gradient-to-r from-blue-500 to-purple-600',
		animated: 'bg-gradient-to-r from-green-500 to-blue-500 animate-pulse'
	};
</script>

<div class="w-full">
	{#if label}
		<div class="flex justify-between text-sm text-slate-400 mb-2">
			<span>{label}</span>
			<span>{value}/{max}</span>
		</div>
	{/if}
	<div class="w-full bg-slate-700 rounded-full {sizeClasses[size]} overflow-hidden">
		<div
			class="{variantClasses[variant]} {sizeClasses[size]} rounded-full transition-all duration-500 ease-out"
			style="width: {percentage}%"
		></div>
	</div>
</div>