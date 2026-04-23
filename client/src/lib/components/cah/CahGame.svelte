<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { LocalPlayer } from '$lib/player';
	import { Status, type CAHGameState, type CAHPlayer } from '$lib/types';
	import { settingsStore } from '$lib/settings';
	import { WebSocketManager } from '$lib/websocket-manager';
	import {
		gameStore,
		connectionStore,
		currentPlayerStore,
		errorStore,
		setError,
		updateConnection
	} from '$lib/stores/game-store';
	import { validateCardSelection, handleValidationError } from '$lib/validation';
	import { v4 as uuidv4 } from 'uuid';
	import posthog from 'posthog-js';

	// Import shared components
	import ConnectionStatus from '../shared/ConnectionStatus.svelte';
	import ErrorDisplay from '../shared/ErrorDisplay.svelte';

	// Import our refactored components
	import CahGameHeader from './components/game/CahGameHeader.svelte';
	import CahPlayerList from './components/game/CahPlayerList.svelte';
	import CahBlackCard from './components/game/CahBlackCard.svelte';
	import CahWaitingPhase from './components/phases/CahWaitingPhase.svelte';
	import CahSelectingPhase from './components/phases/CahSelectingPhase.svelte';
	import CahJudgeSelectingPhase from './components/phases/CahJudgeSelectingPhase.svelte';
	import CahJudgingPhase from './components/phases/CahJudgingPhase.svelte';
	import CahWaitingForJudgePhase from './components/phases/CahWaitingForJudgePhase.svelte';
	import CahScoringPhase from './components/phases/CahScoringPhase.svelte';
	import CahGameOverPhase from './components/phases/CahGameOverPhase.svelte';
	import CahCardPackSelection from './CahCardPackSelection.svelte';

	interface Props {
		id: string;
	}
	let { id }: Props = $props();

	let wsManager: WebSocketManager | null = null;
	let gameState = $derived($gameStore);
	let currentPlayer = $derived($currentPlayerStore);
	let lastRound: number = $state(0);

	// Optimistic UI: keep client thin but provide immediate UX while waiting
	// for the first server state or during in-flight actions.
	let optimisticPhase: 'pack_selection' | 'waiting' | null = $state('pack_selection');

	// Settings
	let settings = settingsStore;

	// --- Debug Bots ---
	type Bot = {
		id: string;
		name: string;
		socket: WebSocket | null;
		connected: boolean;
		lastSubmittedRound: number; // to avoid double-submit in a round
		lastJudgedRound: number; // to avoid double-judge in a round
	};

	let bots: Bot[] = $state([]);

	function createBotName(n: number) {
		return `Bot ${n}`;
	}

	function addBot() {
		const botNumber = bots.length + 1;
		const bot: Bot = {
			id: uuidv4(),
			name: createBotName(botNumber),
			socket: null,
			connected: false,
			lastSubmittedRound: -1,
			lastJudgedRound: -1
		};
		bots = [...bots, bot];
		connectBot(bot);
	}

	function addBots(count: number) {
		for (let i = 0; i < count; i++) addBot();
	}

	function killAllBots() {
		bots.forEach((b) => {
			try {
				b.socket?.close();
			} catch (_) {}
			b.socket = null;
			b.connected = false;
		});
		bots = [];
	}

	function connectBot(bot: Bot) {
		if (bot.socket) return;
		const sock_url = env.PUBLIC_SOCKET_URL ?? 'ws://localhost:3000/';
		const sock_params = `?playing=cards-against-humanity&game=${id}&player=${bot.id}`;
		try {
			bot.socket = new WebSocket(sock_url + sock_params);
		} catch (e) {
			return;
		}

		bot.socket.addEventListener('open', () => {
			bot.connected = true;
			bot.socket?.send(
				JSON.stringify({
					op: 'join_game',
					create: false, // Bots join existing games
					playername: bot.name
				})
			);
		});

		bot.socket.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.op === 'game_state') {
					const g: CAHGameState = data.game;
					// Find this bot as a player in the game
					const me = g.players.find((p) => p.id === bot.id);
					if (!me || !me.connected) return;

					// Selecting phase: submit required number of cards if not judge
					if (g.phase === 'selecting' && !me.isJudge) {
						const alreadySubmitted = (g.submittedCards || []).some(
							(s: any) => s.playerId === bot.id
						);
						if (!alreadySubmitted && g.currentRound !== bot.lastSubmittedRound) {
							const pick = g.currentBlackCard?.pick ?? 1;
							const hand = [...(me.hand || [])];
							if (hand.length >= pick) {
								const chosenIds: string[] = [];
								for (let i = 0; i < pick; i++) {
									const idx = Math.floor(Math.random() * hand.length);
									const card = hand.splice(idx, 1)[0];
									if (card) chosenIds.push(card.id);
								}
								bot.socket?.send(JSON.stringify({ op: 'submit_cards', cardIds: chosenIds }));
								bot.lastSubmittedRound = g.currentRound;
							}
						}
					}

					// Judging phase: if judge, pick a random winner once
					if (g.phase === 'judging' && me.isJudge) {
						if (g.currentRound !== bot.lastJudgedRound) {
							const subs = g.submittedCards || [];
							if (subs.length > 0) {
								const winner = subs[Math.floor(Math.random() * subs.length)];
								bot.socket?.send(
									JSON.stringify({ op: 'select_winner', winnerPlayerId: winner.playerId })
								);
								bot.lastJudgedRound = g.currentRound;
							}
						}
					}
				}
			} catch (_) {}
		});

		bot.socket.addEventListener('close', () => {
			bot.connected = false;
		});
		bot.socket.addEventListener('error', () => {
			bot.connected = false;
		});
	}

	function handleGameState(newGameState: CAHGameState) {
		gameStore.set(newGameState);
		currentPlayerStore.set(newGameState?.players.find((p) => p.id === LocalPlayer.id) || null);
		console.log('Game state:', newGameState);
		// Server is authoritative with a small grace window: if we're optimistically
		// in 'waiting' right after selecting packs, keep showing it until the server
		// acknowledges pack selection (selectedPacks > 0) or transitions phase.
		if (optimisticPhase === 'waiting') {
			const serverHasPacks = (newGameState.selectedPacks?.length || 0) > 0;
			const serverPhaseChanged = newGameState.phase !== 'waiting';
			if (serverHasPacks || serverPhaseChanged) {
				optimisticPhase = null;
			}
		} else {
			// For any other case, default to clearing optimistic overlay
			optimisticPhase = null;
		}
		// Guard: if round advanced, clear local selection to avoid stale UI
		if (newGameState && newGameState.currentRound !== lastRound) {
			selectedCardIds = [];
			lastRound = newGameState.currentRound || 0;
		}
	}

	function handleError(newError: string) {
		setError(newError);
	}

	let hasJoined = false;

	function handleConnectionChange(status: Status, reconnecting?: boolean, attempts?: number) {
		if (status === Status.CONNECTED && !hasJoined) {
			hasJoined = true;
			posthog.capture('game_joined', { game_type: 'cards-against-humanity', game_id: id });
		}
		updateConnection(
			status === Status.CONNECTED
				? 'connected'
				: status === Status.CONNECTING
					? 'connecting'
					: 'disconnected',
			reconnecting,
			attempts
		);
	}

	function connect() {
		if (wsManager) return;

		wsManager = new WebSocketManager({
			gameId: id,
			playerId: LocalPlayer.id,
			playerName: LocalPlayer.name || 'Anonymous Player',
			gameType: 'cards-against-humanity',
			onGameState: handleGameState,
			onError: handleError,
			onConnectionChange: handleConnectionChange
		});

		wsManager.connect();
	}

	let selectedCardIds: string[] = $state([]);

	function toggleSelectCard(cardId: string) {
		if (selectedCardIds.includes(cardId)) {
			selectedCardIds = selectedCardIds.filter((id) => id !== cardId);
		} else {
			selectedCardIds = [...selectedCardIds, cardId];
		}
	}

	function clearSelected() {
		selectedCardIds = [];
	}

	function submitCards(cardIds?: string[]) {
		const toSubmit = cardIds ?? selectedCardIds;
		posthog.capture('cah_cards_submitted', { card_count: toSubmit.length });
		if (wsManager) {
			wsManager.submitCards(toSubmit);
		}
		// Don't clear here, wait for server confirmation
	}

	function selectWinner(winnerPlayerId: string) {
		posthog.capture('cah_winner_selected');
		if (wsManager) {
			wsManager.selectWinner(winnerPlayerId);
		}
	}

	function resetGame() {
		posthog.capture('game_reset', { game_type: 'cards-against-humanity' });
		if (wsManager) {
			wsManager.resetGame();
		}
		// Show pack selection immediately; server will confirm shortly
		optimisticPhase = 'pack_selection';
	}

	function handlePacksSelected(packs: string[]) {
		// Optimistically transition to waiting while server processes selection
		optimisticPhase = 'waiting';
		wsManager?.selectPacks(packs);
	}

	const showPackSelection = $derived.by(() => {
		if (!gameState) {
			return optimisticPhase === 'pack_selection';
		}

		return (
			gameState.phase === 'waiting' &&
			(gameState.selectedPacks?.length || 0) === 0 &&
			optimisticPhase !== 'waiting'
		);
	});

	onMount(() => {
		connect();
		return () => {
			wsManager?.disconnect();
			wsManager = null;
		};
	});

	onDestroy(() => {
		wsManager?.disconnect();
		wsManager = null;
		// Clean up bot sockets
		bots.forEach((b) => {
			try {
				b.socket?.close();
			} catch (_) {}
			b.socket = null;
			b.connected = false;
		});
	});
</script>

{#if showPackSelection}
	<CahCardPackSelection gameId={id} onPacksSelected={handlePacksSelected} />
{:else}
	<div
		class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
	>
		<div class="mx-auto max-w-7xl">
			<section
				class="relative overflow-hidden rounded-[32px] border border-slate-700/70 bg-slate-900/75 p-5 shadow-[0_25px_80px_rgba(2,6,23,0.5)] ring-1 ring-white/5 backdrop-blur-xl sm:p-6 lg:p-8"
			>
				<div
					class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/6 to-transparent"
				></div>
				<div class="relative">
					<div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
								Cards Against Humanity
							</p>
							<h1 class="mt-2 text-3xl font-bold text-white sm:text-4xl">
								Play the table, not the layout
							</h1>
							<p class="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
								The board keeps the prompt, player status, and your actions in fixed zones so the
								round stays readable on desktop and thumb-friendly on mobile.
							</p>
						</div>
						<ConnectionStatus showPing={true} />
					</div>

					<ErrorDisplay />

					{#if gameState}
						<div
							class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]"
						>
							<div class="space-y-6">
								<CahGameHeader gameState={gameState as CAHGameState} />
								<CahBlackCard gameState={gameState as CAHGameState} />

								{#key gameState.phase}
									{#if gameState.phase === 'waiting'}
										{#if optimisticPhase === 'waiting'}
											<section
												class="rounded-[28px] border border-slate-700/70 bg-slate-900/70 p-6 text-center shadow-xl ring-1 ring-white/5 backdrop-blur-sm"
												data-testid="cah-waiting"
											>
												<div
													class="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950/80"
												>
													<svg
														class="h-8 w-8 animate-pulse text-slate-400"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z"
															clip-rule="evenodd"
														/>
													</svg>
												</div>
												<h2 class="text-2xl font-bold text-white">Waiting for players</h2>
												<p class="mx-auto mt-2 max-w-md text-slate-400">
													The room is being prepared. New players can still join while the server
													confirms the pack setup.
												</p>
											</section>
										{:else}
											<CahWaitingPhase gameState={gameState as CAHGameState} />
										{/if}
									{:else if (gameState as CAHGameState).phase === 'selecting' && currentPlayer && (currentPlayer as CAHPlayer).isJudge}
										<CahJudgeSelectingPhase gameState={gameState as CAHGameState} />
									{:else if (gameState as CAHGameState).phase === 'selecting' && currentPlayer && !(currentPlayer as CAHPlayer).isJudge}
										{@const hasSubmitted =
											(gameState as CAHGameState).submittedCards?.some(
												(s) => s.playerId === (currentPlayer as CAHPlayer).id
											) ?? false}
										<CahSelectingPhase
											currentPlayer={currentPlayer as CAHPlayer}
											{selectedCardIds}
											{hasSubmitted}
											gameState={gameState as CAHGameState}
											onCardSelect={toggleSelectCard}
											onSubmitCards={(ids: string[]) => submitCards(ids)}
											onClearSelection={clearSelected}
											requiredCards={(gameState as CAHGameState).currentBlackCard?.pick ?? 1}
										/>
									{:else if (gameState as CAHGameState).phase === 'judging' && (currentPlayer as CAHPlayer)?.isJudge}
										<CahJudgingPhase
											submissions={(gameState as CAHGameState).submittedCards || []}
											onSelectWinner={selectWinner}
										/>
									{:else if (gameState as CAHGameState).phase === 'judging' && !(currentPlayer as CAHPlayer)?.isJudge}
										<CahWaitingForJudgePhase
											submissions={(gameState as CAHGameState).submittedCards || []}
										/>
									{:else if (gameState as CAHGameState).phase === 'scoring'}
										{@const cahState = gameState as CAHGameState}
										{@const winnerPlayer =
											cahState.players.find((p) => p.id === cahState.roundWinner) || null}
										{@const winnerSubmission =
											cahState.submittedCards?.find((s) => s.playerId === cahState.roundWinner) ||
											null}
										<CahScoringPhase {winnerPlayer} {winnerSubmission} />
									{:else if (gameState as CAHGameState).phase === 'game_over'}
										<CahGameOverPhase
											gameState={gameState as CAHGameState}
											currentPlayerId={LocalPlayer.id}
											onResetGame={resetGame}
										/>
									{/if}
								{/key}
							</div>

							<div class="lg:sticky lg:top-6 lg:self-start">
								<CahPlayerList
									gameState={gameState as CAHGameState}
									currentPlayerId={LocalPlayer.id}
								/>
							</div>
						</div>
					{:else if optimisticPhase === 'waiting'}
						<section
							class="rounded-[28px] border border-slate-700/70 bg-slate-900/70 p-6 text-center shadow-xl ring-1 ring-white/5 backdrop-blur-sm"
						>
							<div
								class="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950/80"
							>
								<svg
									class="h-8 w-8 animate-pulse text-slate-400"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<h2 class="text-2xl font-bold text-white">Waiting for players</h2>
							<p class="mx-auto mt-2 max-w-md text-slate-400">
								The table is initializing. As soon as the server confirms the new pack set, the room
								will open for players.
							</p>
						</section>
					{:else}
						<section
							class="rounded-[28px] border border-slate-700/70 bg-slate-900/70 p-6 text-center shadow-xl ring-1 ring-white/5 backdrop-blur-sm"
						>
							<p class="text-lg text-slate-300">Connecting to game...</p>
						</section>
					{/if}

					{#if $settings?.show_debug}
						<div class="mt-8 border-t border-slate-700/50 pt-6">
							<h4 class="mb-3 text-sm font-semibold opacity-70">Debug Controls</h4>
							<div class="mb-4 flex flex-wrap items-center gap-2">
								<button
									class="rounded bg-blue-600 px-3 py-2 text-sm font-medium transition-colors hover:bg-blue-500"
									onclick={() => wsManager?.ping()}
								>
									Ping
								</button>
								<button
									class="rounded bg-red-600 px-3 py-2 text-sm font-medium transition-colors hover:bg-red-500"
									onclick={resetGame}
								>
									Reset Game
								</button>
								<span class="mx-2 opacity-50">|</span>
								<button
									class="rounded bg-emerald-600 px-3 py-2 text-sm font-medium transition-colors hover:bg-emerald-500"
									onclick={addBot}
								>
									Add Bot
								</button>
								<button
									class="rounded bg-emerald-700 px-3 py-2 text-sm font-medium transition-colors hover:bg-emerald-600"
									onclick={() => addBots(2)}
								>
									Add 2 Bots
								</button>
								<button
									class="rounded bg-slate-600 px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-500"
									onclick={killAllBots}
								>
									Kill All Bots
								</button>
							</div>

							{#if bots.length > 0}
								<div class="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
									{#each bots as b (b.id)}
										<div
											class="flex items-center justify-between rounded-md bg-slate-700/40 px-3 py-2"
										>
											<div>
												<div class="text-sm font-medium">{b.name}</div>
												<div class="text-xs opacity-70">{b.id.slice(0, 8)}…</div>
											</div>
											<div class="text-xs {b.connected ? 'text-green-400' : 'text-red-400'}">
												{b.connected ? 'connected' : 'disconnected'}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</section>
		</div>
	</div>
{/if}
