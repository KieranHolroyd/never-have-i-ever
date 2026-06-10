<script lang="ts">
	import type { ActiveGameSummary } from '$lib/types';
	import ActiveGameCard from '$lib/components/games/ActiveGameCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { ToggleGroup, ToggleGroupItem } from '$lib/components/ui/toggle-group';
	import MdiArrowRight from '~icons/mdi/arrow-right';

	interface Props {
		data: {
			games: ActiveGameSummary[];
		};
	}

	type GameTypeFilter = 'all' | ActiveGameSummary['gameType'];

	const gameTypeOptions = [
		{ value: 'all', label: 'All' },
		{ value: 'never-have-i-ever', label: 'Never Have I Ever' },
		{ value: 'cards-against-humanity', label: 'Cards Against Humanity' }
	] as const satisfies ReadonlyArray<{ value: GameTypeFilter; label: string }>;

	let { data }: Props = $props();

	let selectedGameType = $state<GameTypeFilter>('all');

	const filteredGames = $derived(
		selectedGameType === 'all'
			? data.games
			: data.games.filter((game) => game.gameType === selectedGameType)
	);
</script>

<svelte:head>
	<title>Active games ~ games.kieran.dev</title>
</svelte:head>

<div class="py-10 sm:py-14">
	<section class="mx-auto max-w-2xl text-center">
		<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Active games</h1>
		<p class="text-muted-foreground mt-3 text-sm sm:text-base">
			Join a room that's already open, or start your own from the home page.
		</p>
	</section>

	<div class="mx-auto mt-8 flex max-w-3xl justify-center">
		<ToggleGroup
			type="single"
			value={selectedGameType}
			onValueChange={(value) => {
				if (value === 'all' || value === 'never-have-i-ever' || value === 'cards-against-humanity') {
					selectedGameType = value;
				}
			}}
			class="flex-wrap justify-center"
		>
			{#each gameTypeOptions as option (option.value)}
				<ToggleGroupItem value={option.value}>{option.label}</ToggleGroupItem>
			{/each}
		</ToggleGroup>
	</div>

	<section class="mx-auto mt-8 max-w-3xl">
		{#if filteredGames.length > 0}
			<div class="grid gap-3">
				{#each filteredGames as game (game.id)}
					<ActiveGameCard {game} />
				{/each}
			</div>
		{:else}
			<Card>
				<CardContent class="py-10 text-center">
					<p class="text-lg font-semibold">No games right now.</p>
					<p class="text-muted-foreground mt-2 text-sm">
						{selectedGameType === 'all'
							? 'Start a room and share the link with your group.'
							: 'Try a different filter, or start a new room.'}
					</p>
					<div class="mt-6 flex flex-wrap justify-center gap-3">
						{#if selectedGameType !== 'all'}
							<Button variant="outline" onclick={() => (selectedGameType = 'all')}>
								Show all games
							</Button>
						{/if}
						<Button href="/" variant="emerald">
							Start a game
							<MdiArrowRight />
						</Button>
					</div>
				</CardContent>
			</Card>
		{/if}
	</section>
</div>
