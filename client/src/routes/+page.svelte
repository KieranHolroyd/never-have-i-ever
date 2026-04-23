<script lang="ts">
	import { goto } from '$app/navigation';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import MdiCardsPlayingOutline from '~icons/mdi/cards-playing-outline';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import { LocalPlayer } from '$lib/player';
	import type { PageData } from './$types';
	import posthog from 'posthog-js';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function startNhie() {
		posthog.capture('game_started', { game_type: 'never-have-i-ever' });
		if (LocalPlayer.name === null) {
			return goto(`/play/name?redirect=/play/${data.newgame_nhie_id}/never-have-i-ever`);
		}
		goto(`/play/${data.newgame_nhie_id}/never-have-i-ever`);
	}

	function startCah() {
		posthog.capture('game_started', { game_type: 'cards-against-humanity' });
		if (LocalPlayer.name === null) {
			return goto(`/play/name?redirect=/play/${data.newgame_cah_id}/cards-against-humanity`);
		}
		goto(`/play/${data.newgame_cah_id}/cards-against-humanity`);
	}
</script>

<div class="py-16 sm:py-20">
	<!-- Hero -->
	<div class="mb-14 text-center">
		<h1 class="text-5xl sm:text-6xl font-black tracking-tight text-white leading-none">
			Party games<br />
			<span class="text-emerald-400">for everyone.</span>
		</h1>
		<p class="mt-5 text-zinc-400 text-base sm:text-lg max-w-sm mx-auto leading-relaxed">
			No accounts. No installs. Share a link and start playing.
		</p>
	</div>

	<!-- Game Cards -->
	<div class="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
		<!-- NHIE Card -->
		<button
			class="group relative text-left rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden
				hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10
				transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
			onclick={startNhie}
		>
			<div class="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400"></div>
			<div class="p-6 sm:p-8">
				<div class="flex items-start justify-between mb-5">
					<span
						class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400"
					>
						<MdiAccountGroup class="h-7 w-7" />
					</span>
					<span class="text-xs font-medium text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-full"
						>2+ players</span
					>
				</div>
				<h2 class="text-2xl font-bold text-white mb-2">Never Have I Ever</h2>
				<p class="text-zinc-400 text-sm leading-relaxed">
					Real-time confessions and laughs. Pick categories, vote on questions, and find out
					what your friends have really been up to.
				</p>
				<div
					class="mt-7 flex items-center gap-1.5 text-emerald-400 text-sm font-semibold
						group-hover:gap-3 transition-all duration-200"
				>
					<span>Play now</span>
					<MdiArrowRight class="h-4 w-4" />
				</div>
			</div>
		</button>

		<!-- CAH Card -->
		<button
			class="group relative text-left rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden
				hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/10
				transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
			onclick={startCah}
		>
			<div class="h-1 w-full bg-gradient-to-r from-violet-500 to-purple-400"></div>
			<div class="p-6 sm:p-8">
				<div class="flex items-start justify-between mb-5">
					<span
						class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400"
					>
						<MdiCardsPlayingOutline class="h-7 w-7" />
					</span>
					<span class="text-xs font-medium text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-full"
						>Preview</span
					>
				</div>
				<h2 class="text-2xl font-bold text-white mb-2">Cards Against Humanity</h2>
				<p class="text-zinc-400 text-sm leading-relaxed">
					A party game for horrible people. Fill in the blanks with the most outrageous answers
					you can come up with.
				</p>
				<div
					class="mt-7 flex items-center gap-1.5 text-violet-400 text-sm font-semibold
						group-hover:gap-3 transition-all duration-200"
				>
					<span>Play now</span>
					<MdiArrowRight class="h-4 w-4" />
				</div>
			</div>
		</button>
	</div>
</div>
