<script lang="ts">
	import type { PlayerDisplayProps } from '../../types/cah-types';

	interface Props {
		player: PlayerDisplayProps['player'];
		size?: 'sm' | 'md' | 'lg';
		showRank?: boolean;
		rank?: number;
	}

	let { player, size = 'md', showRank = false, rank }: Props = $props();

	const sizeClasses = {
		sm: 'w-8 h-8',
		md: 'w-12 h-12',
		lg: 'w-16 h-16'
	};

	const textSizeClasses = {
		sm: 'text-sm',
		md: 'text-lg',
		lg: 'text-xl'
	};
</script>

<div class="relative inline-block">
	<!-- Avatar -->
	<div class="rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center {sizeClasses[size]}">
		<span class="font-bold text-white {textSizeClasses[size]}">
			{player.name.charAt(0).toUpperCase()}
		</span>
	</div>

	<!-- Rank Badge -->
	{#if showRank && rank && rank <= 3}
		<div class="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
			{rank === 1 ? 'bg-yellow-500 text-black' :
			 rank === 2 ? 'bg-slate-400 text-black' :
			 'bg-amber-600 text-white'}">
			{rank}
		</div>
	{/if}
</div>