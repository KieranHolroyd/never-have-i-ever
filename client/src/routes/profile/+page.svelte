<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import MdiAccountCircle from '~icons/mdi/account-circle';
	import MdiTrophy from '~icons/mdi/trophy';
	import MdiCards from '~icons/mdi/cards';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import MdiCheckCircle from '~icons/mdi/check-circle';
	import MdiCalendar from '~icons/mdi/calendar';
	import MdiArrowRight from '~icons/mdi/arrow-right';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const user = $derived(data.user);
	const nhieStats = $derived(data.nhieStats);
	const cahStats = $derived(data.cahStats);
	const recentNhieGames = $derived(data.recentNhieGames);
	const recentCahGames = $derived(data.recentCahGames);

	const totalGames = $derived(nhieStats.total_games + cahStats.total_games);
	const totalWins = $derived(nhieStats.wins + cahStats.wins);
	const winRate = $derived(
		totalGames > 0
			? Math.round((totalWins / (nhieStats.games_completed + cahStats.games_completed || 1)) * 100)
			: 0
	);

	function formatDate(d: string | Date) {
		return new Date(d).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	}

	function isWinner(score: number, topScore: number) {
		return score >= topScore && topScore > 0;
	}
</script>

<svelte:head>
	<title>Profile ~ {user.nickname}</title>
</svelte:head>

<div class="py-10 space-y-10">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<div class="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 text-zinc-300">
			<MdiAccountCircle class="w-10 h-10" />
		</div>
		<div>
			<h1 class="text-2xl font-bold text-white">{user.nickname}</h1>
			<p class="text-zinc-400 text-sm">{user.email}</p>
		</div>
	</div>

	<!-- Top-level stat pills -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
		<div class="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-center">
			<p class="text-2xl font-bold text-white">{totalGames}</p>
			<p class="text-xs text-zinc-400 mt-1">Games Played</p>
		</div>
		<div class="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-center">
			<p class="text-2xl font-bold text-emerald-400">{totalWins}</p>
			<p class="text-xs text-zinc-400 mt-1">Wins</p>
		</div>
		<div class="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-center">
			<p class="text-2xl font-bold text-white">{winRate}%</p>
			<p class="text-xs text-zinc-400 mt-1">Win Rate</p>
		</div>
		<div class="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-center">
			<p class="text-2xl font-bold text-white">
				{nhieStats.games_completed + cahStats.games_completed}
			</p>
			<p class="text-xs text-zinc-400 mt-1">Completed</p>
		</div>
	</div>

	<!-- Per-game stats -->
	<div class="grid gap-4 md:grid-cols-2">
		<!-- NHIE -->
		<div class="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
			<div class="h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
			<div class="p-5">
				<div class="flex items-center gap-2 mb-4">
					<MdiAccountGroup class="w-5 h-5 text-emerald-400" />
					<h2 class="font-semibold text-white">Never Have I Ever</h2>
				</div>
				<dl class="space-y-2 text-sm">
					<div class="flex justify-between">
						<dt class="text-zinc-400">Games played</dt>
						<dd class="text-white font-medium">{nhieStats.total_games}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-zinc-400">Completed</dt>
						<dd class="text-white font-medium">{nhieStats.games_completed}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-zinc-400">Wins</dt>
						<dd class="text-emerald-400 font-medium">{nhieStats.wins}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-zinc-400">Total score</dt>
						<dd class="text-white font-medium">{nhieStats.total_score.toFixed(1)}</dd>
					</div>
				</dl>
			</div>
		</div>

		<!-- CAH -->
		<div class="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
			<div class="h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
			<div class="p-5">
				<div class="flex items-center gap-2 mb-4">
					<MdiCards class="w-5 h-5 text-violet-400" />
					<h2 class="font-semibold text-white">Cards Against Humanity</h2>
				</div>
				<dl class="space-y-2 text-sm">
					<div class="flex justify-between">
						<dt class="text-zinc-400">Games played</dt>
						<dd class="text-white font-medium">{cahStats.total_games}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-zinc-400">Completed</dt>
						<dd class="text-white font-medium">{cahStats.games_completed}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-zinc-400">Wins</dt>
						<dd class="text-violet-400 font-medium">{cahStats.wins}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-zinc-400">Rounds won</dt>
						<dd class="text-white font-medium">{cahStats.rounds_won}</dd>
					</div>
				</dl>
			</div>
		</div>
	</div>

	<!-- Recent games -->
	{#if recentNhieGames.length > 0 || recentCahGames.length > 0}
		<div class="space-y-4">
			<h2 class="text-lg font-semibold text-white">Recent Games</h2>

			<div class="space-y-2">
				{#each recentNhieGames as game (game.id)}
					{@const won = isWinner(game.score, game.top_score)}
					<div class="flex items-center gap-3 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm">
						<span class="flex-shrink-0 w-2 h-2 rounded-full {won ? 'bg-emerald-400' : 'bg-zinc-600'}"></span>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-zinc-300 font-medium truncate">Never Have I Ever</span>
								{#if won}
									<MdiTrophy class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
								{/if}
								{#if !game.game_completed}
									<span class="text-xs text-zinc-500">(unfinished)</span>
								{/if}
							</div>
							<div class="flex items-center gap-3 mt-0.5 text-zinc-500">
								<span class="flex items-center gap-1">
									<MdiAccountGroup class="w-3 h-3" />
									{game.player_count} players
								</span>
								<span class="flex items-center gap-1">
									<MdiCalendar class="w-3 h-3" />
									{formatDate(game.created_at)}
								</span>
							</div>
						</div>
						<div class="text-right flex-shrink-0">
							<span class="text-white font-semibold">{game.score.toFixed(1)}</span>
							<span class="text-zinc-500"> pts</span>
						</div>
					</div>
				{/each}

				{#each recentCahGames as game (game.id)}
					{@const won = isWinner(game.score, game.top_score)}
					<div class="flex items-center gap-3 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm">
						<span class="flex-shrink-0 w-2 h-2 rounded-full {won ? 'bg-violet-400' : 'bg-zinc-600'}"></span>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-zinc-300 font-medium truncate">Cards Against Humanity</span>
								{#if won}
									<MdiTrophy class="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
								{/if}
								{#if !game.game_completed}
									<span class="text-xs text-zinc-500">(unfinished)</span>
								{/if}
							</div>
							<div class="flex items-center gap-3 mt-0.5 text-zinc-500">
								<span class="flex items-center gap-1">
									<MdiAccountGroup class="w-3 h-3" />
									{game.player_count} players
								</span>
								<span>Rd {game.rounds_played}</span>
								<span class="flex items-center gap-1">
									<MdiCalendar class="w-3 h-3" />
									{formatDate(game.created_at)}
								</span>
							</div>
						</div>
						<div class="text-right flex-shrink-0">
							<span class="text-white font-semibold">{game.score}</span>
							<span class="text-zinc-500"> wins</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="rounded-xl bg-zinc-900 border border-zinc-800 p-8 text-center">
			<MdiAccountGroup class="w-10 h-10 text-zinc-600 mx-auto mb-3" />
			<p class="text-zinc-400">No games recorded yet.</p>
			<p class="text-zinc-500 text-sm mt-1">Play a game while logged in to start tracking stats.</p>
			<button
				onclick={() => goto('/')}
				class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
			>
				Play now <MdiArrowRight class="w-4 h-4" />
			</button>
		</div>
	{/if}
</div>
