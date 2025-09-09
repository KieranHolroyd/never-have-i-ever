<script lang="ts">
	import { goto } from '$app/navigation';
	import MdiInformation from '~icons/mdi/information';
	import MdiGamepadSquare from '~icons/mdi/gamepad-square';
	import { LocalPlayer } from '$lib/player';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function startNhie() {
		if (LocalPlayer.name === null) {
			return goto(`/play/name?redirect=/play/${data.newgame_nhie_id}/never-have-i-ever`);
		}
		goto(`/play/${data.newgame_nhie_id}/never-have-i-ever`);
	}

	function startCah() {
		if (LocalPlayer.name === null) {
			return goto(`/play/name?redirect=/play/${data.newgame_cah_id}/cards-against-humanity`);
		}
		goto(`/play/${data.newgame_cah_id}/cards-against-humanity`);
	}
</script>

<!-- Page Background -->
<div class="min-h-[calc(100vh-4rem)]">
	<!-- Content Container -->
	<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
		<!-- Heading -->
		<header class="text-center mb-8">
			<h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">Multiplayer Party Games</h1>
			<p class="mt-2 text-slate-300 text-sm sm:text-base">
				Pick a game below and share the link with friends. No accounts. Just play.
			</p>
		</header>

		<!-- Game Cards Grid -->
		<section class="grid gap-6 md:grid-cols-2">
			<!-- NHIE Card -->
			<article
				class="relative rounded-2xl border border-slate-700/70 bg-slate-800/50 backdrop-blur-sm shadow-xl ring-1 ring-white/5 transition transform hover:-translate-y-0.5 hover:shadow-2xl"
			>
				<div class="p-6">
					<h2 class="text-2xl font-bold mb-3">Never Have I Ever</h2>
					<div class="flex items-start gap-3 text-slate-300">
						<span
							class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-200"
							><MdiInformation class="h-5 w-5" /></span
						>
						<p class="text-sm leading-6">
							Dive into a virtual realm of cheeky confessions with our real-time online game of
							Never Have I Ever. Discover amusing truths with friends and new acquaintances, share
							laughs, and make memories in this classic party game.
						</p>
					</div>
					<div class="mt-6 flex justify-end">
						<button
							class="group inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-white font-semibold shadow hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
							onclick={startNhie}
						>
							<MdiGamepadSquare class="h-5 w-5" />
							<span>Start New Game</span>
						</button>
					</div>
				</div>
				<div
					class="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-emerald-400/10 via-transparent to-transparent"
				></div>
			</article>

			<!-- CAH Card -->
			<article
				class="relative rounded-2xl border border-slate-700/70 bg-slate-800/50 backdrop-blur-sm shadow-xl ring-1 ring-white/5 transition transform hover:-translate-y-0.5 hover:shadow-2xl"
			>
				<div class="p-6">
					<h2 class="text-2xl font-bold mb-3">Cards Against Humanity</h2>
					<div class="flex items-start gap-3 text-slate-300">
						<span
							class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-200"
							><MdiInformation class="h-5 w-5" /></span
						>
						<p class="text-sm leading-6">
							Play a light multiplayer remake of Cards Against Humanity. This preview is wired to
							the new multi-game engine; full gameplay will evolve over time.
						</p>
					</div>
					<div class="mt-6 flex justify-end">
						<button
							class="group inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-white font-semibold shadow hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
							onclick={startCah}
						>
							<MdiGamepadSquare class="h-5 w-5" />
							<span>Start New Game</span>
						</button>
					</div>
				</div>
				<div
					class="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-emerald-400/10 via-transparent to-transparent"
				></div>
			</article>
		</section>
	</main>
</div>
