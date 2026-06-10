<script lang="ts">
	import { voteBadgeClass } from '$lib/colour';
	import { avatarColorClass, initials } from '$lib/avatar';
	import type { GameRound } from '$lib/types';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';

	interface Props {
		history: GameRound[];
	}

	let { history }: Props = $props();
</script>

{#if history.length > 0}
	<section class="space-y-3 text-left">
		<div class="flex items-center gap-3 pt-2">
			<Separator class="flex-1" />
			<h2 class="text-muted-foreground text-xs font-medium tracking-widest uppercase">
				Round history
			</h2>
			<Separator class="flex-1" />
		</div>

		{#each history as round, idx (idx)}
			<Card size="sm">
				<CardHeader class="pb-2">
					<div class="flex items-center justify-between gap-2">
						<Badge variant="outline">Round {idx + 1}</Badge>
						<Badge
							variant="secondary"
							class="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
						>
							{round.question.catagory}
						</Badge>
					</div>
					<CardTitle class="text-sm leading-snug font-semibold">
						{round.question.content}
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-1">
					{#each round.players.filter((p) => p.connected) as player (player.id)}
						<div class="flex items-center gap-2 rounded-lg px-1.5 py-1">
							<Avatar size="sm">
								<AvatarFallback class="text-[9px] font-bold {avatarColorClass(player.id)}">
									{initials(player.name)}
								</AvatarFallback>
							</Avatar>
							<span class="min-w-0 flex-1 truncate text-sm">{player.name}</span>
							<Badge variant="secondary" class={voteBadgeClass[player.this_round.vote ?? 'null']}>
								{player.this_round.vote ?? 'Not voted'}
							</Badge>
							<Badge variant="outline" class="text-xs">{player.score}</Badge>
						</div>
					{/each}
				</CardContent>
			</Card>
		{/each}
	</section>
{/if}
