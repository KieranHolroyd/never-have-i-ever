<script lang="ts">
	interface Props {
		maxPlayers: number;
		currentPlayers: number;
		minPlayers?: number;
		maxLimit?: number;
		error?: string | null;
		busy?: boolean;
		onSave: (maxPlayers: number) => void;
	}

	let {
		maxPlayers,
		currentPlayers,
		minPlayers = 2,
		maxLimit = 20,
		error = null,
		busy = false,
		onSave
	}: Props = $props();

	let draftMaxPlayers = $state(0);
	let localError = $state<string | null>(null);

	$effect(() => {
		draftMaxPlayers = maxPlayers;
	});

	function save() {
		const normalized = Math.floor(Number(draftMaxPlayers));
		if (!Number.isFinite(normalized) || normalized < minPlayers || normalized > maxLimit) {
			localError = `Room size must be between ${minPlayers} and ${maxLimit} players`;
			return;
		}

		if (normalized < currentPlayers) {
			localError = `Room size cannot be lower than the current player count (${currentPlayers})`;
			return;
		}

		localError = null;
		onSave(normalized);
	}
</script>

<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
	<div class="flex items-start justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 text-sm font-bold text-white/75">
				<span>Room size</span>
			</div>
			<p class="mt-1 text-sm text-white/35">
				Limit how many players can claim a seat in this room before the game starts.
			</p>
		</div>
		<div class="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/50">
			{currentPlayers}/{maxPlayers} seats
		</div>
	</div>

	<div class="mt-4 space-y-3">
		<div class="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-white/35">
			<span>Player cap</span>
			<span>{draftMaxPlayers}</span>
		</div>
		<input
			type="range"
			class="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-500"
			min={minPlayers}
			max={maxLimit}
			step="1"
			bind:value={draftMaxPlayers}
		/>
		<div class="flex items-center justify-between text-xs text-white/25">
			<span>{minPlayers} min</span>
			<span>{maxLimit} max</span>
		</div>
	</div>

	<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
		<input
			type="number"
			class="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
			bind:value={draftMaxPlayers}
			min={minPlayers}
			max={maxLimit}
		/>
		<button
			type="button"
			class="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
			onclick={save}
			disabled={busy}
		>
			Save limit
		</button>
	</div>

	{#if localError || error}
		<p class="mt-3 text-sm text-red-400">{localError ?? error}</p>
	{/if}
</div>