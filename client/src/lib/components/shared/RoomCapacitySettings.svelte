<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';

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

<Card>
	<CardHeader class="flex-row items-start justify-between gap-4 space-y-0">
		<div>
			<CardTitle class="text-base">Room size</CardTitle>
			<CardDescription class="mt-1">
				Limit how many players can claim a seat in this room before the game starts.
			</CardDescription>
		</div>
		<Badge variant="secondary">{currentPlayers}/{maxPlayers} seats</Badge>
	</CardHeader>
	<CardContent class="space-y-4">
		<div class="space-y-3">
			<div class="text-muted-foreground flex items-center justify-between text-xs font-medium uppercase tracking-widest">
				<span>Player cap</span>
				<span>{draftMaxPlayers}</span>
			</div>
			<Input
				type="range"
				class="h-2 cursor-pointer border-0 bg-muted p-0 shadow-none accent-emerald-500 focus-visible:ring-0"
				min={minPlayers}
				max={maxLimit}
				step={1}
				bind:value={draftMaxPlayers}
			/>
			<div class="text-muted-foreground flex justify-between text-xs">
				<span>{minPlayers} min</span>
				<span>{maxLimit} max</span>
			</div>
		</div>

		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			<Input
				type="number"
				class="min-w-0 flex-1"
				bind:value={draftMaxPlayers}
				min={minPlayers}
				max={maxLimit}
			/>
			<Button type="button" variant="emerald" onclick={save} disabled={busy}>Save limit</Button>
		</div>

		{#if localError || error}
			<p class="text-destructive text-sm">{localError ?? error}</p>
		{/if}
	</CardContent>
</Card>
