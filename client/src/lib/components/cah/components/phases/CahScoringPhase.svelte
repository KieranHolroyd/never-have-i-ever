<script lang="ts">
	import { onMount } from 'svelte';
	import type { CAHPlayer, CAHSubmission } from '$lib/types';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Progress } from '$lib/components/ui/progress';

	interface Props {
		winnerPlayer: CAHPlayer | null;
		winnerSubmission: CAHSubmission | null;
	}

	let { winnerPlayer, winnerSubmission }: Props = $props();

	let countdown = $state(5);
	onMount(() => {
		const interval = setInterval(() => {
			countdown = Math.max(0, countdown - 1);
			if (countdown === 0) clearInterval(interval);
		}, 1000);
		return () => clearInterval(interval);
	});

	const countdownProgress = $derived(((5 - countdown) / 5) * 100);
</script>

<div class="space-y-4">
	{#if winnerPlayer}
		<Card class="border-green-500/30 bg-green-500/5 text-center">
			<CardHeader>
				<CardDescription class="text-green-500">Round winner</CardDescription>
				<Avatar size="lg" class="mx-auto">
					<AvatarFallback class="bg-green-500/20 text-2xl font-bold">
						{winnerPlayer.name.charAt(0).toUpperCase()}
					</AvatarFallback>
				</Avatar>
				<CardTitle class="text-2xl">{winnerPlayer.name}</CardTitle>
			</CardHeader>
			<CardContent>
				<CardDescription>+1 point · now has {winnerPlayer.score}</CardDescription>
			</CardContent>
		</Card>

		{#if winnerSubmission && winnerSubmission.cards.length > 0}
			<div>
				<p class="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-widest">
					Winning answer
				</p>
				<div class="space-y-2">
					{#each winnerSubmission.cards as card (card.id)}
						<Card class="border-l-2 border-l-green-500 bg-white text-black">
							<CardContent>
								<p class="text-sm font-medium leading-relaxed">{card.text}</p>
							</CardContent>
						</Card>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	<Card>
		<CardContent class="space-y-3 text-center">
			<p class="text-muted-foreground text-sm font-medium">Next round in {countdown}s…</p>
			<Progress value={countdownProgress} />
		</CardContent>
	</Card>
</div>
