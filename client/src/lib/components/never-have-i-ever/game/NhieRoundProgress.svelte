<script lang="ts">
	interface Props {
		votedCount: number;
		totalCount: number;
		waitingForPlayers: boolean;
		roundTimeout: number;
		timerStarted: boolean;
	}

	let {
		votedCount,
		totalCount,
		waitingForPlayers,
		roundTimeout,
		timerStarted
	}: Props = $props();

	const progressPct = $derived(
		totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0
	);

	const statusLine = $derived.by(() => {
		if (!waitingForPlayers) return null;
		if (!timerStarted) return 'Timer starts when the first player votes';
		if (roundTimeout > 0) return `Auto-advance in ${roundTimeout}s`;
		return 'Moving to next question…';
	});
</script>

{#if waitingForPlayers}
	<div
		class="mx-auto mt-4 w-full max-w-lg rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-center"
		role="status"
	>
		<p class="text-sm font-bold text-amber-200">
			{votedCount} / {totalCount} voted
		</p>
		<div class="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
			<div
				class="h-full rounded-full bg-gradient-to-r from-amber-400 to-fuchsia-400 transition-all duration-500"
				style="width: {progressPct}%"
			></div>
		</div>
		{#if statusLine}
			<p class="mt-2 text-xs text-amber-200/70">{statusLine}</p>
		{/if}
	</div>
{/if}
