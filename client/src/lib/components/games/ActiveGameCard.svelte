<script lang="ts">
	import type { ActiveGameStatus, ActiveGameSummary } from '$lib/types';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import MdiCardsPlayingOutline from '~icons/mdi/cards-playing-outline';
	import MdiLockOutline from '~icons/mdi/lock-outline';
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		game: ActiveGameSummary;
	}

	let { game }: Props = $props();

	function formatGameType(gameType: ActiveGameSummary['gameType']) {
		return gameType === 'never-have-i-ever' ? 'Never Have I Ever' : 'Cards Against Humanity';
	}

	function formatStatus(status: ActiveGameStatus) {
		return status === 'in-progress'
			? 'In progress'
			: status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

<a href={game.href} class="group block">
	<Card
		class="flex-row items-center gap-4 p-4 transition-colors hover:bg-muted/50 sm:p-5 {game.gameType ===
		'never-have-i-ever'
			? 'border-emerald-500/30'
			: 'border-violet-500/30'}"
	>
		<span
			class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl {game.gameType ===
			'never-have-i-ever'
				? 'bg-emerald-500/15 text-emerald-500'
				: 'bg-violet-500/15 text-violet-500'}"
		>
			{#if game.gameType === 'never-have-i-ever'}
				<MdiAccountGroup class="size-5" />
			{:else}
				<MdiCardsPlayingOutline class="size-5" />
			{/if}
		</span>

		<div class="min-w-0 flex-1 text-left">
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant="outline">{formatGameType(game.gameType)}</Badge>
				<Badge variant="secondary">{formatStatus(game.status)}</Badge>
				{#if game.passwordProtected}
					<Badge variant="outline">
						<MdiLockOutline class="size-3.5" />
						Private
					</Badge>
				{/if}
			</div>
			<h2 class="mt-1 truncate text-base font-semibold sm:text-lg">{game.title}</h2>
			<p class="text-muted-foreground mt-0.5 truncate text-sm">
				{game.primaryPlayerName} · {game.playerCount}/{game.maxPlayers} players
			</p>
		</div>

		<span class="text-muted-foreground group-hover:text-foreground inline-flex shrink-0 items-center gap-1 text-sm font-medium">
			Join
			<MdiArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
		</span>
	</Card>
</a>
