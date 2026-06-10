<script lang="ts">
	import { browser } from '$app/environment';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import MdiCardsPlayingOutline from '~icons/mdi/cards-playing-outline';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import MdiLinkVariant from '~icons/mdi/link-variant';
	import MdiFormatListBulleted from '~icons/mdi/format-list-bulleted';
	import MdiPlay from '~icons/mdi/play';
	import { LocalPlayer } from '$lib/player';
	import { safeCapture } from '$lib/analytics';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import {
		Item,
		ItemContent,
		ItemGroup,
		ItemMedia,
		ItemTitle
	} from '$lib/components/ui/item';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function playHref(gameId: string, gameType: string): string {
		const dest = `/play/${gameId}/${gameType}`;
		if (browser && LocalPlayer.name !== null) return dest;
		return `/play/name?redirect=${encodeURIComponent(dest)}`;
	}

	const nhieHref = $derived(playHref(data.newgame_nhie_id, 'never-have-i-ever'));
	const cahHref = $derived(playHref(data.newgame_cah_id, 'cards-against-humanity'));

	function trackNhieStart() {
		safeCapture('game_started', { game_type: 'never-have-i-ever' });
	}

	function trackCahStart() {
		safeCapture('game_started', { game_type: 'cards-against-humanity' });
	}

	const nhieSteps = [
		{ icon: MdiPlay, label: 'Start a room', detail: 'Get a unique link instantly' },
		{ icon: MdiLinkVariant, label: 'Share the link', detail: 'Friends join from any device' },
		{ icon: MdiFormatListBulleted, label: 'Pick categories & play', detail: 'Vote on prompts together' }
	];
</script>

<svelte:head>
	<title>Multiplayer Party Games ~ games.kieran.dev</title>
</svelte:head>

<div class="py-10 sm:py-14">
	<section class="mx-auto max-w-2xl text-center">
		{#if data.active_games_count > 0}
			<Badge href="/games" variant="outline" class="mb-5">
				{data.active_games_count} game{data.active_games_count === 1 ? '' : 's'} live now
			</Badge>
		{/if}

		<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Multiplayer Party Games</h1>
		<p class="text-muted-foreground mt-3 text-sm sm:text-base">
			Share a link, pick a nickname, and play in the browser. No install needed.
		</p>
	</section>

	<section class="mx-auto mt-10 grid max-w-3xl gap-4 sm:mt-12 lg:grid-cols-2">
		<Card class="border-emerald-500/30 lg:col-span-1">
			<CardHeader>
				<div class="flex items-center gap-3">
					<span class="bg-emerald-500/15 text-emerald-500 inline-flex size-10 items-center justify-center rounded-xl">
						<MdiAccountGroup class="size-5" />
					</span>
					<div>
						<CardTitle>Never Have I Ever</CardTitle>
						<CardDescription>2+ players · vote & score</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-muted-foreground text-sm">
					Vote on prompts, track scores, and find out who has done what.
				</p>
				<ItemGroup class="gap-1">
					{#each nhieSteps as step, index (step.label)}
						<Item variant="muted" size="sm">
							<ItemMedia variant="icon">
								<span
									class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 inline-flex size-7 items-center justify-center rounded-md text-xs font-bold"
								>
									{index + 1}
								</span>
							</ItemMedia>
							<ItemContent>
								<ItemTitle class="text-sm">{step.label}</ItemTitle>
								<p class="text-muted-foreground text-xs">{step.detail}</p>
							</ItemContent>
						</Item>
					{/each}
				</ItemGroup>
			</CardContent>
			<CardFooter>
				<Button href={nhieHref} variant="emerald" class="w-full" onclick={trackNhieStart}>
					Start a room
					<MdiArrowRight />
				</Button>
			</CardFooter>
		</Card>

		<Card class="border-violet-500/30">
			<CardHeader>
				<div class="flex items-center gap-3">
					<span class="bg-violet-500/15 text-violet-500 inline-flex size-10 items-center justify-center rounded-xl">
						<MdiCardsPlayingOutline class="size-5" />
					</span>
					<div>
						<CardTitle>Cards Against Humanity</CardTitle>
						<CardDescription>3+ players</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-muted-foreground text-sm">
					Submit the funniest white cards and let the judge pick a winner each round.
				</p>
			</CardContent>
			<CardFooter>
				<Button href={cahHref} variant="violet" class="w-full" onclick={trackCahStart}>
					Start a room
					<MdiArrowRight />
				</Button>
			</CardFooter>
		</Card>
	</section>

	<p class="mt-8 text-center">
		<Button href="/games" variant="link" size="sm">Or join a game already in progress</Button>
	</p>
</div>
