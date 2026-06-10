<script lang="ts">
	import type { CAHGameState } from '$lib/types';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		Item,
		ItemContent,
		ItemDescription,
		ItemGroup,
		ItemMedia,
		ItemTitle
	} from '$lib/components/ui/item';

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();

	const nonJudges = $derived(gameState.players.filter((p) => p.connected && !p.isJudge));
	const submittedCount = $derived(gameState.submittedCards?.length ?? 0);
	const totalNeeded = $derived(nonJudges.length);
	const allSubmitted = $derived(submittedCount >= totalNeeded && totalNeeded > 0);
	const submitProgress = $derived(
		totalNeeded > 0 ? Math.round((submittedCount / totalNeeded) * 100) : 0
	);
	const submittedPlayerIds = $derived(
		new Set((gameState.submittedCards ?? []).map((s) => s.playerId))
	);
</script>

<div class="space-y-4">
	<Card class="border-amber-500/30 bg-amber-500/5">
		<CardHeader>
			<CardDescription class="text-amber-500">You are the judge</CardDescription>
			<CardTitle>
				{allSubmitted ? 'All cards are in — get ready!' : 'Waiting for submissions'}
			</CardTitle>
			<Badge variant={allSubmitted ? 'default' : 'secondary'}>
				{submittedCount}/{totalNeeded}
			</Badge>
		</CardHeader>
		<CardContent class="space-y-4">
			<CardDescription>
				{allSubmitted
					? 'All players have played their cards. Phase will switch to judging shortly.'
					: `${totalNeeded - submittedCount} player${totalNeeded - submittedCount === 1 ? '' : 's'} still choosing…`}
			</CardDescription>
			<Progress value={submitProgress} />
		</CardContent>
	</Card>

	<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
		{#each nonJudges as player (player.id)}
			{@const hasSubmitted = submittedPlayerIds.has(player.id)}
			<Card class={hasSubmitted ? 'border-green-500/30 bg-green-500/5' : ''}>
				<CardContent>
					<ItemGroup>
						<Item>
							<ItemMedia>
								<Avatar size="sm">
									<AvatarFallback class={hasSubmitted ? 'bg-green-500 text-white' : ''}>
										{hasSubmitted ? '✓' : '…'}
									</AvatarFallback>
								</Avatar>
							</ItemMedia>
							<ItemContent>
								<ItemTitle class={hasSubmitted ? '' : 'text-muted-foreground'}>
									{player.name}
								</ItemTitle>
								<ItemDescription class={hasSubmitted ? 'text-green-500' : ''}>
									{hasSubmitted ? 'submitted' : 'choosing…'}
								</ItemDescription>
							</ItemContent>
						</Item>
					</ItemGroup>
				</CardContent>
			</Card>
		{/each}
	</div>
</div>
