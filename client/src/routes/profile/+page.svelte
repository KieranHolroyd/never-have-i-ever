<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import MdiAccountCircle from '~icons/mdi/account-circle';
	import MdiTrophy from '~icons/mdi/trophy';
	import MdiCards from '~icons/mdi/cards';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import MdiCalendar from '~icons/mdi/calendar';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import MdiPencil from '~icons/mdi/pencil';
	import MdiCheck from '~icons/mdi/check';
	import MdiLock from '~icons/mdi/lock';
	import MdiAlertCircle from '~icons/mdi/alert-circle';
	import MdiEmail from '~icons/mdi/email';
	import MdiLogout from '~icons/mdi/logout';
	import MdiLinkVariant from '~icons/mdi/link-variant';
	import MdiLinkVariantOff from '~icons/mdi/link-variant-off';
	import LogosGoogle from '~icons/logos/google-icon';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	const user = $derived(data.user);
	const nhieStats = $derived(data.nhieStats);
	const cahStats = $derived(data.cahStats);
	const recentNhieGames = $derived(data.recentNhieGames);
	const recentCahGames = $derived(data.recentCahGames);
	const googleAccount = $derived(data.googleAccount);

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

	// Which settings panel is open
	let openPanel: 'nickname' | 'email' | 'password' | null = $state(null);
	function toggle(panel: typeof openPanel) {
		openPanel = openPanel === panel ? null : panel;
	}
</script>

<svelte:head>
	<title>Profile ~ {user.nickname}</title>
</svelte:head>

<div class="py-10 space-y-10">
	<!-- Email verification banner -->
	{#if !user.email_verified}
		<div class="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
			<MdiAlertCircle class="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
			<div class="flex-1">
				<p class="text-yellow-300 font-medium">Verify your email</p>
				<p class="text-yellow-400/80 text-xs mt-0.5">
					We sent a link to <span class="font-medium">{user.email}</span>. Check your inbox.
				</p>
			</div>
			<form method="POST" action="?/resend_verification" use:enhance>
				<button
					type="submit"
					class="text-xs text-yellow-300 hover:text-yellow-100 underline underline-offset-2 transition-colors"
				>
					{form?.action === 'resend_verification' && form.success ? 'Sent!' : 'Resend'}
				</button>
			</form>
		</div>
	{/if}

	<!-- Header -->
	<div class="flex items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<div class="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 text-zinc-300">
				<MdiAccountCircle class="w-10 h-10" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-white">{user.nickname}</h1>
				<p class="text-zinc-400 text-sm">{user.email}</p>
			</div>
		</div>
		<form method="POST" action="/auth/logout" use:enhance>
			<button
				type="submit"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
			>
				<MdiLogout class="w-4 h-4" />
				<span class="hidden sm:inline">Sign out</span>
			</button>
		</form>
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

	<!-- Account settings -->
	<div class="space-y-3">
		<h2 class="text-lg font-semibold text-white">Account Settings</h2>

		<!-- Nickname -->
		<div class="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
			<button
				type="button"
				onclick={() => toggle('nickname')}
				class="w-full flex items-center justify-between px-5 py-4 text-sm hover:bg-zinc-800/50 transition-colors"
			>
				<div class="flex items-center gap-3">
					<MdiPencil class="w-4 h-4 text-zinc-400" />
					<div class="text-left">
						<p class="text-white font-medium">Username</p>
						<p class="text-zinc-500 text-xs mt-0.5">{user.nickname}</p>
					</div>
				</div>
				<span class="text-zinc-500 text-xs">{openPanel === 'nickname' ? 'Cancel' : 'Change'}</span>
			</button>
			{#if openPanel === 'nickname'}
				<form
					method="POST"
					action="?/update_nickname"
					use:enhance={() => {
						return ({ update }) => update({ reset: false });
					}}
					class="border-t border-zinc-800 px-5 py-4 space-y-3"
				>
					{#if form?.action === 'update_nickname' && form.error}
						<p class="text-red-400 text-sm">{form.error}</p>
					{/if}
					{#if form?.action === 'update_nickname' && form.success}
						<p class="text-emerald-400 text-sm flex items-center gap-1.5"><MdiCheck class="w-4 h-4" /> Username updated.</p>
					{/if}
					<div>
						<label for="nickname" class="block text-xs text-zinc-400 mb-1">New username</label>
						<input
							id="nickname"
							name="nickname"
							type="text"
							value={user.nickname}
							maxlength={30}
							required
							class="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
						/>
					</div>
					<button
						type="submit"
						class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
					>Save</button>
				</form>
			{/if}
		</div>

		<!-- Email -->
		<div class="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
			<button
				type="button"
				onclick={() => toggle('email')}
				class="w-full flex items-center justify-between px-5 py-4 text-sm hover:bg-zinc-800/50 transition-colors"
			>
				<div class="flex items-center gap-3">
					<MdiEmail class="w-4 h-4 text-zinc-400" />
					<div class="text-left">
						<p class="text-white font-medium">Email</p>
						<p class="text-zinc-500 text-xs mt-0.5">{user.email}</p>
					</div>
				</div>
				<span class="text-zinc-500 text-xs">{openPanel === 'email' ? 'Cancel' : 'Change'}</span>
			</button>
			{#if openPanel === 'email'}
				<form
					method="POST"
					action="?/update_email"
					use:enhance={() => {
						return ({ update }) => update({ reset: false });
					}}
					class="border-t border-zinc-800 px-5 py-4 space-y-3"
				>
					{#if form?.action === 'update_email' && form.error}
						<p class="text-red-400 text-sm">{form.error}</p>
					{/if}
					{#if form?.action === 'update_email' && form.success}
						<p class="text-emerald-400 text-sm flex items-center gap-1.5"><MdiCheck class="w-4 h-4" /> Email updated.</p>
					{/if}
					<div>
						<label for="email" class="block text-xs text-zinc-400 mb-1">New email</label>
						<input
							id="email"
							name="email"
							type="email"
							value={user.email}
							required
							class="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
						/>
					</div>
					<div>
						<label for="email-password" class="block text-xs text-zinc-400 mb-1">Current password</label>
						<input
							id="email-password"
							name="password"
							type="password"
							placeholder="Confirm with your password"
							required
							class="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
						/>
					</div>
					<button
						type="submit"
						class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
					>Save</button>
				</form>
			{/if}
		</div>

		<!-- Password -->
		<div class="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
			<button
				type="button"
				onclick={() => toggle('password')}
				class="w-full flex items-center justify-between px-5 py-4 text-sm hover:bg-zinc-800/50 transition-colors"
			>
				<div class="flex items-center gap-3">
					<MdiLock class="w-4 h-4 text-zinc-400" />
					<div class="text-left">
						<p class="text-white font-medium">Password</p>
						<p class="text-zinc-500 text-xs mt-0.5">••••••••</p>
					</div>
				</div>
				<span class="text-zinc-500 text-xs">{openPanel === 'password' ? 'Cancel' : 'Change'}</span>
			</button>
			{#if openPanel === 'password'}
				<form
					method="POST"
					action="?/update_password"
					use:enhance={() => {
						return ({ update }) => update({ reset: false });
					}}
					class="border-t border-zinc-800 px-5 py-4 space-y-3"
				>
					{#if form?.action === 'update_password' && form.error}
						<p class="text-red-400 text-sm">{form.error}</p>
					{/if}
					{#if form?.action === 'update_password' && form.success}
						<p class="text-emerald-400 text-sm flex items-center gap-1.5"><MdiCheck class="w-4 h-4" /> Password updated.</p>
					{/if}
					<div>
						<label for="current_password" class="block text-xs text-zinc-400 mb-1">Current password</label>
						<input
							id="current_password"
							name="current_password"
							type="password"
							required
							class="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
						/>
					</div>
					<div>
						<label for="new_password" class="block text-xs text-zinc-400 mb-1">New password</label>
						<input
							id="new_password"
							name="new_password"
							type="password"
							minlength={8}
							required
							class="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
						/>
					</div>
					<div>
						<label for="confirm_password" class="block text-xs text-zinc-400 mb-1">Confirm new password</label>
						<input
							id="confirm_password"
							name="confirm_password"
							type="password"
							minlength={8}
							required
							class="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
						/>
					</div>
					<button
						type="submit"
						class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
					>Save</button>
				</form>
			{/if}
		</div>

		<!-- Google account connection -->
		<div class="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
			<div class="flex items-center justify-between px-5 py-4 text-sm">
				<div class="flex items-center gap-3">
					<LogosGoogle class="w-4 h-4 flex-shrink-0" />
					<div>
						<p class="text-white font-medium">Google</p>
						{#if googleAccount}
							<p class="text-zinc-500 text-xs mt-0.5">{googleAccount.email}</p>
						{:else}
							<p class="text-zinc-500 text-xs mt-0.5">Not connected</p>
						{/if}
					</div>
				</div>
				{#if googleAccount}
					<form method="POST" action="?/unlink_google" use:enhance={() => ({ update }) => update({ reset: false })}>
						<button
							type="submit"
							class="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition-colors"
						>
							<MdiLinkVariantOff class="w-3.5 h-3.5" />
							Unlink
						</button>
					</form>
				{:else}
					<a
						href="/auth/google?link=1"
						class="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
					>
						<MdiLinkVariant class="w-3.5 h-3.5" />
						Connect
					</a>
				{/if}
			</div>
			{#if form?.action === 'unlink_google' && form.success}
				<p class="px-5 pb-3 text-xs text-emerald-400">Google account unlinked.</p>
			{/if}
		</div>
	</div>
</div>
