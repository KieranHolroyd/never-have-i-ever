<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { LocalPlayer } from '$lib/player';
	import { Status, type CAHGameState, type CAHPlayer } from '$lib/types';
	import { settingsStore } from '$lib/settings';
	import { buildSocketUrl } from '$lib/socket-url';
	import { WebSocketManager } from '$lib/websocket-manager';
	import {
		gameStore,
		connectionStore,
		currentPlayerStore,
		errorStore,
		setError,
		clearError,
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
		userId?: string;
	}
	let { id, userId }: Props = $props();

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

	function syncBots() {
		bots = [...bots];
	}

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
		syncBots();
		bots = [];
	}

	function connectBot(bot: Bot) {
		if (bot.socket) return;
		const socketUrl = buildSocketUrl(undefined, {
			playing: 'cards-against-humanity',
			game: id,
			player: bot.id
		});
		try {
			bot.socket = new WebSocket(socketUrl);
		} catch (e) {
			return;
		}

		bot.socket.addEventListener('open', () => {
			bot.connected = true;
			syncBots();
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
			syncBots();
		});
		bot.socket.addEventListener('error', () => {
			bot.connected = false;
			syncBots();
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
		if (!newError) {
			clearError();
		} else {
			setError(newError);
		}
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
			userId,
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

	function handlePacksSelected(packs: string[], settings: { maxRounds: number; handSize: number }) {
		// Optimistically transition to waiting while server processes selection
		optimisticPhase = 'waiting';
		wsManager?.selectPacks(packs, settings);
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
		syncBots();
	});
</script>

{#if showPackSelection}
	<CahCardPackSelection gameId={id} onPacksSelected={handlePacksSelected} />
{:else}
	<div class="min-h-screen bg-[#111111] text-white">
		<!-- Sticky top bar -->
		<header
			class="sticky top-0 z-30 border-b border-white/[0.07] bg-[#111111]/96 backdrop-blur-md px-4 py-3 sm:px-6 lg:px-8"
		>
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<span class="text-[11px] font-black uppercase tracking-[0.35em] text-white/25"
						>Cards Against Humanity</span
					>
					{#if gameState}
						<div
							class="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50"
						>
							{gameState.phase?.replace('_', ' ') ?? 'waiting'}
						</div>
					{/if}
				</div>
				<ConnectionStatus showPing={true} />
			</div>
			<ErrorDisplay />
		</header>

		<!-- Main layout: content + sidebar -->
		<div class="flex items-start gap-6 p-4 sm:p-6 lg:p-8">
			<!-- Primary content -->
			<div class="min-w-0 flex-1 space-y-5">
				{#if gameState}
					<CahGameHeader gameState={gameState as CAHGameState} />
					<CahBlackCard gameState={gameState as CAHGameState} />

					{#key gameState.phase}
						{#if gameState.phase === 'waiting'}
							{#if optimisticPhase === 'waiting'}
								<div
									class="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 text-center"
									data-testid="cah-waiting"
								>
									<div
										class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]"
									>
										<svg
											class="h-7 w-7 animate-pulse text-white/30"
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
									<h2 class="text-xl font-black text-white">Waiting for players</h2>
									<p class="mt-2 text-sm text-white/40">
										The room is being prepared. New players can still join.
									</p>
								</div>
							{:else}
								<CahWaitingPhase gameState={gameState as CAHGameState} onGoBack={resetGame} />
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
					{:else if (gameState as CAHGameState).phase === 'judging' && (currentPlayer as CAHPlayer)?.isJudge === true}
						<CahJudgingPhase
							submissions={(gameState as CAHGameState).submittedCards || []}
							onSelectWinner={selectWinner}
						/>
					{:else if (gameState as CAHGameState).phase === 'judging' && (currentPlayer as CAHPlayer)?.isJudge === false}
							<CahWaitingForJudgePhase
								submissions={(gameState as CAHGameState).submittedCards || []}
							/>
						{:else if (gameState as CAHGameState).phase === 'scoring'}
							{@const cahState = gameState as CAHGameState}
							{@const winnerPlayer =
								cahState.players.find((p) => p.id === cahState.roundWinner) || null}
							{@const winnerSubmission =
								cahState.submittedCards?.find((s) => s.playerId === cahState.roundWinner) || null}
							<CahScoringPhase {winnerPlayer} {winnerSubmission} />
						{:else if (gameState as CAHGameState).phase === 'game_over'}
							<CahGameOverPhase
								gameState={gameState as CAHGameState}
								currentPlayerId={LocalPlayer.id}
								onResetGame={resetGame}
							/>
						{/if}
					{/key}
				{:else if optimisticPhase === 'waiting'}
					<div class="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 text-center">
						<div
							class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]"
						>
							<svg
								class="h-7 w-7 animate-pulse text-white/30"
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
						<h2 class="text-xl font-black text-white">Waiting for players</h2>
						<p class="mt-2 text-sm text-white/40">
							The table is initializing. The room will open once the server confirms the pack setup.
						</p>
					</div>
				{:else}
					<div class="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 text-center">
						<p class="text-white/40">Connecting to game…</p>
					</div>
				{/if}

				{#if $settings?.show_debug}
					<div class="mt-8 border-t border-white/10 pt-6">
						<h4 class="mb-3 text-sm font-semibold text-white/40">Debug Controls</h4>
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
							<span class="mx-2 text-white/20">|</span>
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
								class="rounded bg-white/10 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/20"
								onclick={killAllBots}
							>
								Kill All Bots
							</button>
						</div>

						{#if bots.length > 0}
							<div class="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
								{#each bots as b (b.id)}
									<div
										class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
									>
										<div>
											<div class="text-sm font-medium text-white">{b.name}</div>
											<div class="text-xs text-white/30">{b.id.slice(0, 8)}…</div>
										</div>
										<div class="text-xs {b.connected ? 'text-green-400' : 'text-red-400'}">
											{b.connected ? 'connected' : 'off'}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Sticky player sidebar -->
			<aside
				class="hidden w-72 shrink-0 lg:sticky lg:top-[3.375rem] lg:block lg:self-start xl:w-80"
			>
				{#if gameState}
					<CahPlayerList gameState={gameState as CAHGameState} currentPlayerId={LocalPlayer.id} />
				{/if}
			</aside>
		</div>
	</div>
{/if}
