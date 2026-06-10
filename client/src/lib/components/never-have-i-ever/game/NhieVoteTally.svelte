<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import type { Player } from '$lib/types';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

	interface Props {
		players: Player[];
	}

	let { players }: Props = $props();

	const segments = [
		{ label: 'Have', bar: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
		{ label: 'Kinda', bar: 'bg-sky-500', dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400' },
		{ label: 'Have Not', bar: 'bg-rose-500', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' }
	];

	const counts = $derived(
		segments.map((segment) => ({
			...segment,
			count: players.filter((p) => p.this_round.vote === segment.label).length
		}))
	);

	const totalVotes = $derived(counts.reduce((sum, c) => sum + c.count, 0));
</script>

{#if totalVotes > 0}
	<div in:fly={{ y: 8, duration: 240, easing: quintOut }}>
		<Card size="sm">
			<CardHeader class="pb-2">
				<CardTitle class="text-sm font-medium">Round results</CardTitle>
			</CardHeader>
			<CardContent class="space-y-3">
				<!-- Segmented bar -->
				<div class="bg-muted flex h-3 w-full overflow-hidden rounded-full">
					{#each counts as { label, bar, count } (label)}
						{#if count > 0}
							<div
								class="{bar} transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full"
								style="width: {(count / totalVotes) * 100}%"
								title="{label}: {count}"
							></div>
						{/if}
					{/each}
				</div>

				<!-- Legend -->
				<div class="grid grid-cols-3 gap-1">
					{#each counts as { label, dot, text, count } (label)}
						<div class="flex flex-col gap-0.5 {count === 0 ? 'opacity-40' : ''}">
							<span class="text-muted-foreground flex items-center gap-1 text-[10px]">
								<span class="size-1.5 rounded-full {dot}"></span>
								{label}
							</span>
							<span class="text-lg font-bold tabular-nums {count > 0 ? text : 'text-muted-foreground'}">
								{count}
							</span>
							{#if count > 0}
								<span class="text-muted-foreground text-[10px] tabular-nums">
									{Math.round((count / totalVotes) * 100)}%
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	</div>
{/if}
