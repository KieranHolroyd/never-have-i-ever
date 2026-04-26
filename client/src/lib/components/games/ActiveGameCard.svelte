<script lang="ts">
	import type { ActiveGameStatus, ActiveGameSummary } from '$lib/types';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import MdiCardsPlayingOutline from '~icons/mdi/cards-playing-outline';
	import MdiLockOutline from '~icons/mdi/lock-outline';

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

	function formatCreatedAt(createdAt: string) {
		return new Intl.DateTimeFormat('en-GB', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(createdAt));
	}

	function formatPhase(phase: string) {
		return phase
			.replaceAll('_', ' ')
			.replaceAll('-', ' ')
			.replace(/\b\w/g, (letter) => letter.toUpperCase());
	}

	function getInitials(name: string) {
		return name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('');
	}

	const seatFillPercentage = $derived(
		Math.min(100, Math.round((game.playerCount / Math.max(game.maxPlayers, 1)) * 100))
	);

	const accentClass = $derived(
		game.gameType === 'never-have-i-ever'
			? 'border-l-emerald-400 hover:border-l-emerald-300'
			: 'border-l-violet-400 hover:border-l-violet-300'
	);

	const gameTextClass = $derived(
		game.gameType === 'never-have-i-ever' ? 'text-emerald-300' : 'text-violet-300'
	);

	const progressClass = $derived(
		game.gameType === 'never-have-i-ever' ? 'bg-emerald-400' : 'bg-violet-400'
	);

	const ctaClass = $derived(
		game.gameType === 'never-have-i-ever'
			? 'text-emerald-300 group-hover:text-emerald-200'
			: 'text-violet-300 group-hover:text-violet-200'
	);

	const statusClass = $derived(
		game.status === 'waiting'
			? 'text-amber-300'
			: game.status === 'completed'
				? 'text-zinc-500'
				: 'text-emerald-300'
	);

	const statusDotClass = $derived(
		game.status === 'waiting'
			? 'bg-amber-300'
			: game.status === 'completed'
				? 'bg-zinc-600'
				: 'bg-emerald-400'
	);
</script>

<a
	href={game.href}
	class={`group block rounded-xl border border-l-4 border-zinc-800 bg-zinc-950/95 p-4 shadow-sm transition-colors hover:border-zinc-700 hover:bg-zinc-900/90 ${accentClass}`}
>
	<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-zinc-500">
				<span class={`inline-flex items-center gap-1.5 ${gameTextClass}`}>
					{#if game.gameType === 'never-have-i-ever'}
						<MdiAccountGroup class="h-4 w-4" />
					{:else}
						<MdiCardsPlayingOutline class="h-4 w-4" />
					{/if}
					{formatGameType(game.gameType)}
				</span>
				<span class={`inline-flex items-center gap-1.5 ${statusClass}`}>
					<span class={`h-1.5 w-1.5 rounded-sm ${statusDotClass}`}></span>
					{formatStatus(game.status)}
				</span>
				{#if game.passwordProtected}
					<span class="inline-flex items-center gap-1.5 text-zinc-400">
						<MdiLockOutline class="h-3.5 w-3.5" />
						Private
					</span>
				{/if}
				<span class="font-mono uppercase text-zinc-600">{game.id.slice(0, 8)}</span>
			</div>

			<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div class="min-w-0">
					<h3 class="truncate text-xl font-black tracking-normal text-white sm:text-2xl">
						{game.title}
					</h3>
					<p class="mt-1 truncate text-sm text-zinc-400">
						Hosted by <span class="font-semibold text-zinc-200">{game.primaryPlayerName}</span>
						<span class="text-zinc-600"> · {formatCreatedAt(game.createdAt)}</span>
					</p>
				</div>
				<div class={`inline-flex items-center gap-1.5 text-sm font-bold ${ctaClass}`}>
					Enter room
					<MdiArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
				</div>
			</div>

			<div class="mt-4 grid gap-3 border-t border-zinc-800 pt-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
				<div class="min-w-0">
					<p class="text-[11px] font-semibold uppercase tracking-normal text-zinc-600">Phase</p>
					<p class="mt-0.5 truncate text-sm font-semibold text-zinc-200">{formatPhase(game.phase)}</p>
				</div>
				<div class="flex items-center gap-2 overflow-hidden">
					{#each game.players.slice(0, 4) as player (player.id)}
						<span
							class={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-black ${player.connected ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-zinc-700 bg-zinc-900 text-zinc-500'}`}
							title={player.name}
						>
							{getInitials(player.name)}
						</span>
					{/each}

					{#if game.players.length > 4}
						<span class="inline-flex h-7 shrink-0 items-center rounded-md border border-zinc-700 px-2 text-[10px] font-black text-zinc-400">
							+{game.players.length - 4}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 text-center lg:grid-cols-1 lg:text-left">
			<div class="bg-zinc-950 px-3 py-2">
				<p class="text-[11px] font-semibold uppercase tracking-normal text-zinc-600">Players</p>
				<p class="mt-0.5 text-sm font-black text-white">{game.playerCount}/{game.maxPlayers}</p>
			</div>
			<div class="bg-zinc-950 px-3 py-2">
				<p class="text-[11px] font-semibold uppercase tracking-normal text-zinc-600">Online</p>
				<p class="mt-0.5 text-sm font-black text-white">{game.connectedPlayerCount}</p>
			</div>
			<div class="bg-zinc-950 px-3 py-2">
				<div class="flex items-center justify-between gap-2 lg:block">
					<div>
						<p class="text-[11px] font-semibold uppercase tracking-normal text-zinc-600">Filled</p>
						<p class="mt-0.5 text-sm font-black text-white">{seatFillPercentage}%</p>
					</div>
					<div class="h-1.5 w-16 overflow-hidden rounded-sm bg-zinc-800 lg:mt-2 lg:w-full">
						<div class={`h-full rounded-sm ${progressClass}`} style={`width: ${seatFillPercentage}%`}></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</a>
