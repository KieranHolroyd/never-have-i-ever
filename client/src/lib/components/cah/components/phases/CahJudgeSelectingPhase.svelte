<script lang="ts">
	import type { CAHGameState } from '$lib/types';

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();

	const nonJudges = $derived(gameState.players.filter((p) => p.connected && !p.isJudge));
	const submittedCount = $derived(gameState.submittedCards?.length ?? 0);
	const totalNeeded = $derived(nonJudges.length);
	const allSubmitted = $derived(submittedCount >= totalNeeded && totalNeeded > 0);

	const submittedPlayerIds = $derived(new Set((gameState.submittedCards ?? []).map((s) => s.playerId)));
</script>

<div class="mb-6">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			<h3 class="text-xl font-semibold">Waiting for Submissions</h3>
			<div
				class="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full text-sm text-yellow-400 font-medium"
			>
				<svg class="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
				You are the judge
			</div>
		</div>
		<div class="text-sm text-slate-400">
			{submittedCount} / {totalNeeded} submitted
		</div>
	</div>

	<!-- Progress bar -->
	<div class="w-full bg-slate-700 rounded-full h-2 mb-6">
		<div
			class="h-2 rounded-full transition-all duration-500 {allSubmitted
				? 'bg-gradient-to-r from-emerald-500 to-green-400'
				: 'bg-gradient-to-r from-yellow-500 to-amber-400'}"
			style="width: {totalNeeded > 0 ? Math.round((submittedCount / totalNeeded) * 100) : 0}%"
		></div>
	</div>

	<!-- Player submission status -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
		{#each nonJudges as player (player.id)}
			{@const hasSubmitted = submittedPlayerIds.has(player.id)}
			<div
				class="flex items-center gap-3 rounded-lg p-3 border transition-all duration-300
				{hasSubmitted
					? 'bg-emerald-500/10 border-emerald-500/30'
					: 'bg-slate-700/40 border-slate-600/30'}"
			>
				<div
					class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
					{hasSubmitted ? 'bg-emerald-500' : 'bg-slate-600'}"
				>
					{#if hasSubmitted}
						<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 101.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							/>
						</svg>
					{:else}
						<svg
							class="w-4 h-4 text-slate-400 animate-pulse"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
					{/if}
				</div>
				<div class="min-w-0">
					<div
						class="text-sm font-medium truncate {hasSubmitted ? 'text-emerald-300' : 'text-slate-300'}"
					>
						{player.name}
					</div>
					<div class="text-xs {hasSubmitted ? 'text-emerald-400' : 'text-slate-500'}">
						{hasSubmitted ? 'Submitted ✓' : 'Choosing...'}
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if allSubmitted}
		<div
			class="flex items-center justify-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
		>
			<svg class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
					clip-rule="evenodd"
				/>
			</svg>
			<span class="text-emerald-300 font-medium">All players have submitted — get ready to judge!</span>
		</div>
	{:else}
		<div
			class="flex items-center justify-center gap-3 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg"
		>
			<svg class="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z"
					clip-rule="evenodd"
				/>
			</svg>
			<span class="text-slate-400">Sit tight — reviewing submissions once everyone has played</span>
		</div>
	{/if}
</div>
