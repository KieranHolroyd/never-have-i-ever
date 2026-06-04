<script lang="ts">
	import { browser } from '$app/environment';
	import type { ActiveGameStatus, ActiveGameSummary } from '$lib/types';
	import ActiveGameCard from '$lib/components/games/ActiveGameCard.svelte';
	import SiteHero from '$lib/components/ui/SiteHero.svelte';
	import SiteCard from '$lib/components/ui/SiteCard.svelte';
	import SiteButton from '$lib/components/ui/SiteButton.svelte';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import MdiMagnify from '~icons/mdi/magnify';
	import MdiTimerSand from '~icons/mdi/timer-sand';
	import MdiTrendingUp from '~icons/mdi/trending-up';

	interface Props {
		data: {
			games: ActiveGameSummary[];
			initialSearchQuery: string;
			initialGameType: GameTypeFilter;
			initialStatus: StatusFilter;
		};
	}

	type GameTypeFilter = 'all' | ActiveGameSummary['gameType'];
	type StatusFilter = 'all' | ActiveGameStatus;

	const gameTypeOptions = [
		{ value: 'all', label: 'All games' },
		{ value: 'never-have-i-ever', label: 'Never Have I Ever' },
		{ value: 'cards-against-humanity', label: 'Cards Against Humanity' }
	] as const satisfies ReadonlyArray<{ value: GameTypeFilter; label: string }>;

	const statusOptions = [
		{ value: 'all', label: 'Any status' },
		{ value: 'waiting', label: 'Waiting' },
		{ value: 'in-progress', label: 'In progress' },
		{ value: 'completed', label: 'Completed' }
	] as const satisfies ReadonlyArray<{ value: StatusFilter; label: string }>;

	let { data }: Props = $props();

	let searchQuery = $state('');
	let selectedGameType = $state<GameTypeFilter>('all');
	let selectedStatus = $state<StatusFilter>('all');
	let filtersInitialized = $state(false);

	const totalGames = $derived(data.games.length);
	const waitingGames = $derived(data.games.filter((game) => game.status === 'waiting').length);
	const inProgressGames = $derived(
		data.games.filter((game) => game.status === 'in-progress').length
	);

	const filteredGames = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();

		return data.games.filter((game) => {
			if (selectedGameType !== 'all' && game.gameType !== selectedGameType) {
				return false;
			}

			if (selectedStatus !== 'all' && game.status !== selectedStatus) {
				return false;
			}

			if (!query) {
				return true;
			}

			const searchIndex = [
				game.title,
				game.primaryPlayerName,
				game.id,
				game.phase,
				...game.players.map((player) => player.name)
			]
				.join(' ')
				.toLowerCase();

			return searchIndex.includes(query);
		});
	});

	function syncFiltersToUrl() {
		if (!browser || !filtersInitialized) {
			return;
		}

		const url = new URL(window.location.href);
		const normalizedQuery = searchQuery.trim();

		if (normalizedQuery) {
			url.searchParams.set('q', normalizedQuery);
		} else {
			url.searchParams.delete('q');
		}

		if (selectedGameType !== 'all') {
			url.searchParams.set('type', selectedGameType);
		} else {
			url.searchParams.delete('type');
		}

		if (selectedStatus !== 'all') {
			url.searchParams.set('status', selectedStatus);
		} else {
			url.searchParams.delete('status');
		}

		if (url.search === window.location.search) {
			return;
		}

		window.history.replaceState(window.history.state, '', url);
	}

	$effect(() => {
		if (filtersInitialized) {
			return;
		}

		searchQuery = data.initialSearchQuery;
		selectedGameType = data.initialGameType;
		selectedStatus = data.initialStatus;
		filtersInitialized = true;
	});

	$effect(() => {
		syncFiltersToUrl();
	});
</script>

<div class="py-12 sm:py-16">
	<SiteHero
		label="Drop-in rooms"
		title="Active games worth joining."
		subtitle="Search by player, narrow by game type, and jump into rooms that already have momentum."
	>
		{#snippet stats()}
			<div class="site-surface p-4">
				<div class="flex items-center gap-2 site-phase-label">
					<MdiAccountGroup class="h-4 w-4" />
					<span>Total</span>
				</div>
				<p class="mt-3 text-3xl font-black text-white">{totalGames}</p>
			</div>
			<div class="site-surface p-4">
				<div class="flex items-center gap-2 site-phase-label">
					<MdiTimerSand class="h-4 w-4" />
					<span>Waiting</span>
				</div>
				<p class="mt-3 text-3xl font-black text-white">{waitingGames}</p>
			</div>
			<div class="site-surface p-4">
				<div class="flex items-center gap-2 site-phase-label">
					<MdiTrendingUp class="h-4 w-4" />
					<span>Live</span>
				</div>
				<p class="mt-3 text-3xl font-black text-white">{inProgressGames}</p>
			</div>
		{/snippet}
	</SiteHero>

	<SiteCard class="mt-6" padding="md">
		<div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
			<label class="relative block">
				<span class="sr-only">Search games</span>
				<MdiMagnify class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
				<input
					class="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-12 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
					type="search"
					placeholder="Search by player, room title, phase, or game ID"
					bind:value={searchQuery}
				/>
			</label>

			<label class="block">
				<span class="sr-only">Filter by game type</span>
				<select
					bind:value={selectedGameType}
					class="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
				>
					{#each gameTypeOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="sr-only">Filter by status</span>
				<select
					bind:value={selectedStatus}
					class="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
				>
					{#each statusOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
		</div>
	</SiteCard>

	<!-- Games list -->
	<section class="mt-8">
		<div class="mb-4 flex items-center justify-between gap-3">
			<div>
				<h2 class="text-lg font-bold text-white">Join a live room</h2>
				<p class="text-sm text-zinc-500">
					{filteredGames.length} result{filteredGames.length === 1 ? '' : 's'}
				</p>
			</div>
			<SiteButton href="/" variant="secondary">
				Start your own
				<MdiArrowRight class="ml-1 inline h-4 w-4" />
			</SiteButton>
		</div>

		{#if filteredGames.length > 0}
			<div class="grid gap-4 lg:grid-cols-2">
				{#each filteredGames as game (game.id)}
					<ActiveGameCard {game} />
				{/each}
			</div>
		{:else}
			<div class="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-12 text-center">
				<h2 class="text-2xl font-bold text-white">No games match those filters.</h2>
				<p class="mt-3 text-sm text-zinc-400 sm:text-base">
					Try a wider search, switch status, or start a new room.
				</p>
				<div class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
					<button
						type="button"
						class="rounded-full bg-zinc-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
						onclick={() => {
							searchQuery = '';
							selectedGameType = 'all';
							selectedStatus = 'all';
						}}
					>
						Clear filters
					</button>
					<SiteButton href="/">
						Start a game
						<MdiArrowRight class="ml-1 inline h-4 w-4" />
					</SiteButton>
				</div>
			</div>
		{/if}
	</section>
</div>