<script lang="ts">
	import { browser } from '$app/environment';
	import type { ActiveGameStatus, ActiveGameSummary } from '$lib/types';
	import ActiveGameCard from '$lib/components/games/ActiveGameCard.svelte';
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
	<!-- Hero / stats banner -->
	<section class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 px-6 py-8 sm:px-10 sm:py-10">
		<div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.2),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.16),_transparent_30%)]"></div>
		<div class="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
			<div>
				<p class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
					Drop-in rooms
				</p>
				<h1 class="mt-3 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">
					Active games worth joining.
				</h1>
				<p class="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
					Search by player, narrow by game type, and jump straight into rooms that already
					have momentum.
				</p>
			</div>

			<div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
				<div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
					<div class="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
						<MdiAccountGroup class="h-4 w-4" />
						<span>Total rooms</span>
					</div>
					<p class="mt-3 text-3xl font-black text-white">{totalGames}</p>
				</div>
				<div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
					<div class="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
						<MdiTimerSand class="h-4 w-4" />
						<span>Waiting</span>
					</div>
					<p class="mt-3 text-3xl font-black text-white">{waitingGames}</p>
				</div>
				<div class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
					<div class="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
						<MdiTrendingUp class="h-4 w-4" />
						<span>Live now</span>
					</div>
					<p class="mt-3 text-3xl font-black text-white">{inProgressGames}</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Search & filters -->
	<section class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
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
	</section>

	<!-- Games list -->
	<section class="mt-8">
		<div class="mb-4 flex items-center justify-between gap-3">
			<div>
				<h2 class="text-lg font-bold text-white">Join a live room</h2>
				<p class="text-sm text-zinc-500">
					{filteredGames.length} result{filteredGames.length === 1 ? '' : 's'}
				</p>
			</div>
			<a
				href="/"
				class="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
			>
				Start your own
				<MdiArrowRight class="h-4 w-4" />
			</a>
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
					<a
						href="/"
						class="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
					>
						Start a game
						<MdiArrowRight class="h-4 w-4" />
					</a>
				</div>
			</div>
		{/if}
	</section>
</div>