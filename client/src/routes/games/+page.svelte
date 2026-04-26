<script lang="ts">
	import type { ActiveGameStatus, ActiveGameSummary } from '$lib/types';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import MdiCardsPlayingOutline from '~icons/mdi/cards-playing-outline';
	import MdiMagnify from '~icons/mdi/magnify';
	import MdiTimerSand from '~icons/mdi/timer-sand';
	import MdiTrendingUp from '~icons/mdi/trending-up';

	interface Props {
		data: {
			games: ActiveGameSummary[];
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

	function formatGameType(gameType: ActiveGameSummary['gameType']) {
		return gameType === 'never-have-i-ever' ? 'Never Have I Ever' : 'Cards Against Humanity';
	}

	function formatStatus(status: ActiveGameStatus) {
		return status === 'in-progress'
			? 'In progress'
			: status.charAt(0).toUpperCase() + status.slice(1);
	}

	function formatCreatedAt(createdAt: string) {
		return new Intl.DateTimeFormat('en-GB', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(createdAt));
	}

	function getStatusClasses(status: ActiveGameStatus) {
		if (status === 'waiting') {
			return 'bg-amber-500/10 text-amber-300 border border-amber-400/20';
		}

		if (status === 'completed') {
			return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
		}

		return 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/20';
	}

	function getInitials(name: string) {
		return name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('');
	}
</script>

<div class="py-12 sm:py-16">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
		<section class="relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900/80 px-6 py-8 sm:px-10 sm:py-10">
			<div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.2),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.16),_transparent_30%)]"></div>
			<div class="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
						Drop-in rooms
					</p>
					<h1 class="mt-3 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">
						Active games worth joining.
					</h1>
					<p class="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
						Search by player, narrow by game type, and jump straight into rooms that already
						have momentum.
					</p>
				</div>

				<div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
					<div class="rounded-2xl border border-zinc-800 bg-black/20 p-4">
						<div class="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
							<MdiAccountGroup class="h-4 w-4" />
							<span>Total rooms</span>
						</div>
						<p class="mt-3 text-3xl font-black text-white">{totalGames}</p>
					</div>
					<div class="rounded-2xl border border-zinc-800 bg-black/20 p-4">
						<div class="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
							<MdiTimerSand class="h-4 w-4" />
							<span>Waiting</span>
						</div>
						<p class="mt-3 text-3xl font-black text-white">{waitingGames}</p>
					</div>
					<div class="rounded-2xl border border-zinc-800 bg-black/20 p-4">
						<div class="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
							<MdiTrendingUp class="h-4 w-4" />
							<span>Live now</span>
						</div>
						<p class="mt-3 text-3xl font-black text-white">{inProgressGames}</p>
					</div>
				</div>
			</div>
		</section>

		<section class="mt-6 rounded-[1.75rem] border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5">
			<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
				<label class="relative block">
					<span class="sr-only">Search games</span>
					<MdiMagnify class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
					<input
						class="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-12 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
						type="search"
						placeholder="Search by player, room title, phase, or game ID"
						bind:value={searchQuery}
					/>
				</label>

				<div class="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-end">
					{#each gameTypeOptions as option}
						<button
							type="button"
							class="rounded-2xl px-4 py-3 text-sm font-medium transition-colors
								{selectedGameType === option.value
									? 'bg-emerald-500 text-zinc-950'
									: 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'}"
							onclick={() => {
								selectedGameType = option.value;
							}}
						>
							{option.label}
						</button>
					{/each}
				</div>

				<div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap lg:justify-end">
					{#each statusOptions as option}
						<button
							type="button"
							class="rounded-2xl px-4 py-3 text-sm font-medium transition-colors
								{selectedStatus === option.value
									? 'bg-white text-zinc-950'
									: 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'}"
							onclick={() => {
								selectedStatus = option.value;
							}}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>
		</section>

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
						<a
							href={game.href}
							class="group rounded-[1.75rem] border border-zinc-800 bg-zinc-900/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10"
						>
							<div class="flex items-start justify-between gap-4">
								<div>
									<div class="flex flex-wrap items-center gap-2">
										<span class="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
											{#if game.gameType === 'never-have-i-ever'}
												<MdiAccountGroup class="h-4 w-4 text-emerald-400" />
											{:else}
												<MdiCardsPlayingOutline class="h-4 w-4 text-violet-400" />
											{/if}
											<span>{formatGameType(game.gameType)}</span>
										</span>
										<span class={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(game.status)}`}>
											{formatStatus(game.status)}
										</span>
									</div>
									<h3 class="mt-4 text-2xl font-black tracking-tight text-white transition-colors group-hover:text-emerald-300">
										{game.title}
									</h3>
									<p class="mt-2 text-sm text-zinc-400">
										Primary player: {game.primaryPlayerName}
									</p>
								</div>

								<div class="text-right text-xs uppercase tracking-[0.18em] text-zinc-500">
									<p>{formatCreatedAt(game.createdAt)}</p>
									<p class="mt-2">{game.phase.replaceAll('_', ' ')}</p>
								</div>
							</div>

							<div class="mt-6 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
								<span class="rounded-full bg-zinc-950 px-3 py-1.5 text-zinc-300">
									{game.connectedPlayerCount}/{game.playerCount} online
								</span>
								<span class="rounded-full bg-zinc-950 px-3 py-1.5 text-zinc-400">
									Game ID {game.id.slice(0, 8)}
								</span>
							</div>

							<div class="mt-6 flex flex-wrap gap-2">
								{#each game.players.slice(0, 5) as player (player.id)}
									<div class="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-300">
										<span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-white">
											{getInitials(player.name)}
										</span>
										<span>{player.name}</span>
										<span class={`h-2.5 w-2.5 rounded-full ${player.connected ? 'bg-emerald-400' : 'bg-zinc-600'}`}></span>
									</div>
								{/each}
								{#if game.players.length > 5}
									<div class="inline-flex items-center rounded-full border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-500">
										+{game.players.length - 5} more
									</div>
								{/if}
							</div>

							<div class="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-all group-hover:gap-3">
								<span>Join room</span>
								<MdiArrowRight class="h-4 w-4" />
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="rounded-[1.75rem] border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-12 text-center">
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
</div>