<script lang="ts">
	import type { CAHGameState } from '$lib/types';
	import { Progress } from '$lib/components/ui/progress';
	import { Avatar, AvatarFallback, AvatarGroup } from '$lib/components/ui/avatar';

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();

	const pct = $derived(Math.round((gameState.currentRound / gameState.maxRounds) * 100));
	const activePlayers = $derived(gameState.players.filter((p) => p.connected));
</script>

<div class="flex items-center gap-4">
	<div class="flex shrink-0 items-baseline gap-1.5">
		<span class="text-4xl font-bold leading-none">{gameState.currentRound}</span>
		<span class="text-muted-foreground text-sm font-medium">/ {gameState.maxRounds}</span>
	</div>

	<Progress value={pct} class="flex-1" />

	<div class="flex shrink-0 items-center gap-1.5">
		<AvatarGroup>
			{#each activePlayers.slice(0, 4) as player (player.id)}
				<Avatar size="sm">
					<AvatarFallback>{player.name.charAt(0).toUpperCase()}</AvatarFallback>
				</Avatar>
			{/each}
			{#if activePlayers.length > 4}
				<Avatar size="sm">
					<AvatarFallback class="text-muted-foreground text-[10px]">
						+{activePlayers.length - 4}
					</AvatarFallback>
				</Avatar>
			{/if}
		</AvatarGroup>
		<span class="text-muted-foreground text-xs font-medium">{activePlayers.length} playing</span>
	</div>
</div>
