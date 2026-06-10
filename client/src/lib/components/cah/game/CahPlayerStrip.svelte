<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import type { CAHPlayer } from '$lib/types';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger
	} from '$lib/components/ui/collapsible';
	import {
		Item,
		ItemActions,
		ItemContent,
		ItemGroup,
		ItemTitle
	} from '$lib/components/ui/item';

	interface Props {
		players: CAHPlayer[];
		currentPlayerId?: string | null;
		judgeId?: string | null;
	}

	let { players, currentPlayerId = null, judgeId = null }: Props = $props();

	let expanded = $state(false);

	const connected = $derived(players.filter((p) => p.connected));
</script>

<div class="mx-auto mt-4 w-full max-w-lg lg:hidden">
	<Collapsible bind:open={expanded}>
		<CollapsibleTrigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="outline"
					class="mb-2 w-full justify-between text-xs uppercase"
				>
					<span>Table ({connected.length})</span>
					<span class="text-muted-foreground">{expanded ? 'Hide' : 'Show'}</span>
				</Button>
			{/snippet}
		</CollapsibleTrigger>

		<CollapsibleContent>
			<Card>
				<CardContent>
					<ItemGroup>
						{#each connected as player, index (player.id)}
							<div
								in:fly={{ y: 4, duration: 180, delay: Math.min(index * 20, 200), easing: backOut }}
								animate:flip
							>
							<Item>
								<ItemContent>
									<ItemTitle>
										<span
											class={`size-2 rounded-full ${player.id === currentPlayerId ? 'bg-violet-400' : 'bg-muted-foreground/30'}`}
										></span>
										{player.name}
									</ItemTitle>
								</ItemContent>
								<ItemActions>
									{#if player.id === judgeId}
										<Badge variant="secondary" class="text-violet-400">Judge</Badge>
									{/if}
									<Badge variant="secondary">{player.score}</Badge>
								</ItemActions>
							</Item>
							</div>
						{/each}
					</ItemGroup>
				</CardContent>
			</Card>
		</CollapsibleContent>
	</Collapsible>

	{#if !expanded}
		<div class="flex gap-2 overflow-x-auto pb-1">
			{#each connected as player (player.id)}
				<div class="shrink-0" animate:flip>
					<Card class="relative min-w-[4.5rem] p-3">
						<Badge class="absolute -right-0.5 -top-0.5" variant="default">{player.score}</Badge>
						<div class="flex flex-col items-center gap-1">
							<span
								class={`size-2 rounded-full ${player.id === judgeId ? 'bg-amber-400' : player.id === currentPlayerId ? 'bg-violet-400' : 'bg-muted-foreground/30'}`}
							></span>
							<span class="max-w-[5rem] truncate text-xs font-medium">{player.name}</span>
						</div>
					</Card>
				</div>
			{/each}
		</div>
	{/if}
</div>
