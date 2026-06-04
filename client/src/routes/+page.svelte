<script lang="ts">
	import { browser } from '$app/environment';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import MdiCardsPlayingOutline from '~icons/mdi/cards-playing-outline';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import MdiLinkVariant from '~icons/mdi/link-variant';
	import MdiLightningBolt from '~icons/mdi/lightning-bolt';
	import MdiAccountMultiple from '~icons/mdi/account-multiple';
	import { LocalPlayer } from '$lib/player';
	import { safeCapture } from '$lib/analytics';
	import SiteButton from '$lib/components/ui/SiteButton.svelte';
	import type { PageData } from './$types';
	import type { Component } from 'svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const steps: { icon: Component; title: string; body: string }[] = [
		{
			icon: MdiLinkVariant,
			title: 'Share a link',
			body: 'Create a room in one tap. Send the URL to your group chat.'
		},
		{
			icon: MdiAccountMultiple,
			title: 'Friends join instantly',
			body: 'No download. Pick a nickname and you are in the lobby.'
		},
		{
			icon: MdiLightningBolt,
			title: 'Play in real time',
			body: 'Votes, cards, and scores sync live for everyone.'
		}
	];

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
</script>

<svelte:head>
	<title>Multiplayer Party Games ~ games.kieran.dev</title>
</svelte:head>

<div class="pb-8 pt-6 sm:pt-10">
	<!-- Hero -->
	<section class="site-home-hero">
		<div class="site-home-hero-glow" aria-hidden="true"></div>
		<div class="relative mx-auto max-w-3xl text-center lg:max-w-4xl">
			{#if data.active_games_count > 0}
				<a
					href="/games"
					class="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
				>
					<span class="relative flex h-2 w-2">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"
						></span>
						<span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
					</span>
					{data.active_games_count} game{data.active_games_count === 1 ? '' : 's'} live now
				</a>
			{:else}
				<p class="site-phase-label mb-4 text-emerald-300/70">games.kieran.dev</p>
			{/if}

			<h1 class="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
				Multiplayer Party Games
			</h1>
			<p class="mt-4 text-lg font-bold sm:text-xl">
				<span class="site-home-title-gradient">No install. No fuss.</span>
			</p>
			<p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/45 sm:text-base">
				Host Never Have I Ever or Cards Against Humanity in the browser. Share a link, gather your
				people, and start the chaos.
			</p>

			<div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
				<SiteButton href={nhieHref} onclick={trackNhieStart} class="w-full min-w-[10rem] sm:w-auto">
					Start Never Have I Ever
				</SiteButton>
				<SiteButton
					href={cahHref}
					onclick={trackCahStart}
					variant="secondary"
					class="w-full min-w-[10rem] sm:w-auto"
				>
					Start Cards Against Humanity
				</SiteButton>
			</div>
			<SiteButton href="/games" variant="ghost" class="mt-4">
				Or browse rooms already in progress
				<MdiArrowRight class="ml-1 inline h-4 w-4" />
			</SiteButton>
		</div>
	</section>

	<!-- How it works -->
	<section class="mx-auto mt-14 max-w-5xl">
		<p class="site-phase-label text-center">How it works</p>
		<h2 class="mt-2 text-center text-2xl font-black text-white sm:text-3xl">Three steps to game night</h2>
		<ol class="mt-8 grid gap-4 sm:grid-cols-3">
			{#each steps as step, i (step.title)}
				{@const StepIcon = step.icon}
				<li class="site-surface relative p-5 text-center sm:text-left">
					<span
						class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-emerald-400"
					>
						<StepIcon class="h-5 w-5" />
					</span>
					<span class="site-phase-label mb-1 block text-fuchsia-300/60">Step {i + 1}</span>
					<h3 class="text-lg font-black text-white">{step.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-white/45">{step.body}</p>
				</li>
			{/each}
		</ol>
	</section>

	<!-- Pick a game -->
	<section class="mx-auto mt-16 max-w-5xl">
		<div class="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="site-phase-label">Choose your game</p>
				<h2 class="text-2xl font-black text-white sm:text-3xl">What are you playing tonight?</h2>
			</div>
			<p class="max-w-xs text-sm text-white/40">Both games are free, browser-based, and built for groups.</p>
		</div>

		<div class="grid gap-5 lg:grid-cols-2">
			<!-- NHIE -->
			<article
				class="site-surface site-accent-nhie group relative flex flex-col overflow-hidden transition duration-300 hover:scale-[1.01]"
			>
				<div class="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300"></div>
				<div class="flex flex-1 flex-col p-6 sm:p-8">
					<div class="flex items-start justify-between gap-3">
						<span
							class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
						>
							<MdiAccountGroup class="h-8 w-8" />
						</span>
						<span
							class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-300"
							>2+ players</span
						>
					</div>
					<h3 class="mt-6 text-2xl font-black text-white sm:text-3xl">Never Have I Ever</h3>
					<p class="mt-3 flex-1 text-sm leading-relaxed text-white/50 sm:text-base">
						Pick categories, reveal awkward prompts, and vote Have, Kinda, or Have not. Scores
						tell the story — perfect for icebreakers and close friends.
					</p>
					<ul class="mt-4 space-y-1.5 text-xs font-semibold text-white/35">
						<li>· Category decks &amp; NSFW filters</li>
						<li>· Real-time voting &amp; round history</li>
					</ul>
					<SiteButton href={nhieHref} onclick={trackNhieStart} fullWidth class="mt-8 gap-2 group-hover:bg-emerald-400">
						Play Never Have I Ever
						<MdiArrowRight class="h-5 w-5" />
					</SiteButton>
				</div>
			</article>

			<!-- CAH -->
			<article
				class="site-surface site-accent-cah group relative flex flex-col overflow-hidden transition duration-300 hover:scale-[1.01]"
			>
				<div class="h-1.5 w-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-violet-300"></div>
				<div class="flex flex-1 flex-col p-6 sm:p-8">
					<div class="flex items-start justify-between gap-3">
						<span
							class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/20"
						>
							<MdiCardsPlayingOutline class="h-8 w-8" />
						</span>
						<span
							class="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-violet-300"
							>3+ players</span
						>
					</div>
					<h3 class="mt-6 text-2xl font-black text-white sm:text-3xl">Cards Against Humanity</h3>
					<p class="mt-3 flex-1 text-sm leading-relaxed text-white/50 sm:text-base">
						One judge, one black card, everyone submits their funniest white cards. Pack
						selection, hand management, and scoring — the full tabletop vibe online.
					</p>
					<ul class="mt-4 space-y-1.5 text-xs font-semibold text-white/35">
						<li>· Official &amp; community card packs</li>
						<li>· Judge rounds &amp; live leaderboard</li>
					</ul>
					<SiteButton
						href={cahHref}
						onclick={trackCahStart}
						variant="violet"
						fullWidth
						class="mt-8 gap-2 group-hover:shadow-[0_0_32px_-8px_rgba(139,92,246,0.5)]"
					>
						Play Cards Against Humanity
						<MdiArrowRight class="h-5 w-5" />
					</SiteButton>
				</div>
			</article>
		</div>
	</section>

	<!-- Bottom CTA -->
	<section class="mx-auto mt-16 max-w-3xl">
		<div class="site-surface relative overflow-hidden px-6 py-10 text-center sm:px-10">
			<div
				class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.08),_transparent_70%)]"
				aria-hidden="true"
			></div>
			<p class="relative site-phase-label">Ready when you are</p>
			<p class="relative mt-2 text-xl font-black text-white sm:text-2xl">
				Your next room is one click away.
			</p>
			<div class="relative mt-6 flex flex-wrap justify-center gap-3">
				<SiteButton href={nhieHref} onclick={trackNhieStart}>Start a room</SiteButton>
				<SiteButton href="/games" variant="secondary">Join a live game</SiteButton>
			</div>
		</div>
	</section>
</div>
