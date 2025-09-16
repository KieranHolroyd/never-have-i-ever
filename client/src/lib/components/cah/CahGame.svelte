<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { LocalPlayer } from '$lib/player';
	import { Status, type CAHGameState, type CAHPlayer } from '$lib/types';
	import { settingsStore } from '$lib/settings';
	import { CAHWebSocketManager } from '$lib/cah-websocket-manager';
	import { v4 as uuidv4 } from 'uuid';

	// Import our refactored components
	import CahGameHeader from './components/game/CahGameHeader.svelte';
	import CahPlayerList from './components/game/CahPlayerList.svelte';
	import CahBlackCard from './components/game/CahBlackCard.svelte';
	import CahWaitingPhase from './components/phases/CahWaitingPhase.svelte';
    import CahSelectingPhase from './components/phases/CahSelectingPhase.svelte';
	import CahJudgingPhase from './components/phases/CahJudgingPhase.svelte';
	import CahWaitingForJudgePhase from './components/phases/CahWaitingForJudgePhase.svelte';
	import CahScoringPhase from './components/phases/CahScoringPhase.svelte';
    import CahGameOverPhase from './components/phases/CahGameOverPhase.svelte';
    import CahCardPackSelection from './CahCardPackSelection.svelte';

    interface Props {
        id: string;
    }
    let { id }: Props = $props();

	let wsManager: CAHWebSocketManager | null = null;
	let connection: Status = $state(Status.CONNECTING);
	let gameState: CAHGameState | null = $state(null);
	let currentPlayer: CAHPlayer | null = $state(null);
	let lastRound: number = $state(0);
	let error: string | null = $state(null);
	let isReconnecting = $state(false);
	let reconnectAttempts = $state(0);

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
        gameState = newGameState;
        currentPlayer = gameState?.players.find((p) => p.id === LocalPlayer.id) || null;
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
		if (gameState && gameState.currentRound !== lastRound) {
			selectedCardIds = [];
			lastRound = gameState.currentRound;
		}
	}

	function handleError(newError: string) {
		error = newError;
	}

	function handleConnectionChange(status: Status, reconnecting?: boolean, attempts?: number) {
		connection = status;
		isReconnecting = reconnecting || false;
		if (attempts !== undefined) {
			reconnectAttempts = attempts;
		}
	}

    function connect() {
		if (wsManager) return;

		wsManager = new CAHWebSocketManager({
			gameId: id,
			playerId: LocalPlayer.id,
			playerName: LocalPlayer.name || 'Anonymous Player',
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
		if (wsManager) {
			wsManager.submitCards(toSubmit);
		}
		// Don't clear here, wait for server confirmation
	}

	function selectWinner(winnerPlayerId: string) {
		if (wsManager) {
			wsManager.selectWinner(winnerPlayerId);
		}
	}

	function resetGame() {
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

<div class="max-w-6xl mx-auto p-4">
	<div
		class="rounded-2xl border border-slate-700/70 bg-slate-800/50 backdrop-blur-sm shadow-xl ring-1 ring-white/5 p-6"
	>
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-3xl font-bold">Cards Against Humanity</h1>
			<div class="text-sm opacity-70">
				Status: <span
					class={connection === Status.CONNECTED
						? 'text-green-400'
						: connection === Status.CONNECTING
							? 'text-yellow-400'
							: 'text-red-400'}
				>
					{connection}
					{#if isReconnecting}
						<span class="text-yellow-400 animate-pulse">(Reconnecting... {reconnectAttempts}/10)</span>
					{/if}
				</span>
			</div>
		</div>

		{#if error}
			<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
				<p class="text-red-400">{error}</p>
			</div>
		{/if}

		{#if gameState}
			<!-- Game Header -->
			<CahGameHeader {gameState} />

			<!-- Players List -->
			<CahPlayerList {gameState} currentPlayerId={LocalPlayer.id} />

			<!-- Current Black Card -->
			<CahBlackCard {gameState} />

			<!-- Game Content Based on Phase -->
			{#if gameState.phase === 'waiting'}
				{#if optimisticPhase === 'waiting'}
					<!-- Optimistic waiting overlay until server acknowledges pack selection -->
					<div class="text-center py-12" data-testid="cah-waiting">
						<div class="mb-6">
							<div class="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
								<svg class="w-8 h-8 text-slate-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd"/>
								</svg>
							</div>
							<h2 class="text-2xl font-bold text-white mb-2">Waiting for Players</h2>
							<p class="text-slate-400 max-w-md mx-auto">The game will begin once more players join the room.</p>
						</div>
					</div>
				{:else if (gameState.selectedPacks?.length || 0) === 0}
					<CahCardPackSelection gameId={id} onPacksSelected={handlePacksSelected} />
				{:else}
					<CahWaitingPhase {gameState} />
				{/if}
            {:else if gameState.phase === 'selecting' && currentPlayer && !currentPlayer.isJudge}
                <CahSelectingPhase
                    {currentPlayer}
                    selectedCardIds={selectedCardIds}
                    onCardSelect={toggleSelectCard}
                    onSubmitCards={(ids) => submitCards(ids)}
                    onClearSelection={clearSelected}
                    requiredCards={gameState.currentBlackCard?.pick ?? 1}
                />
			{:else if gameState.phase === 'judging' && currentPlayer?.isJudge}
				<CahJudgingPhase
					submissions={gameState.submittedCards}
					onSelectWinner={selectWinner}
				/>
			{:else if gameState.phase === 'judging' && !currentPlayer?.isJudge}
				<CahWaitingForJudgePhase
					submissions={gameState.submittedCards}
				/>

			{:else if gameState.phase === 'scoring'}
				{@const winnerPlayer = gameState!.players.find((p) => p.id === gameState!.roundWinner) || null}
				<CahScoringPhase {winnerPlayer} />
			{:else if gameState.phase === 'game_over'}
				<CahGameOverPhase
					{gameState}
					currentPlayerId={LocalPlayer.id}
					onResetGame={resetGame}
				/>
			{/if}
		{:else}
			<!-- Optimistic fallback UI while awaiting first server state -->
            {#if optimisticPhase === 'pack_selection'}
                <CahCardPackSelection gameId={id} onPacksSelected={handlePacksSelected} />
			{:else if optimisticPhase === 'waiting'}
				<div class="text-center py-12">
					<div class="mb-6">
						<div class="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
							<svg class="w-8 h-8 text-slate-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd"/>
							</svg>
						</div>
						<h2 class="text-2xl font-bold text-white mb-2">Waiting for Players</h2>
						<p class="text-slate-400 max-w-md mx-auto">The game will begin once more players join the room.</p>
					</div>
				</div>
			{:else}
				<div class="text-center py-8">
					<p class="text-lg opacity-70">Connecting to game...</p>
				</div>
			{/if}
		{/if}

		<!-- Debug Controls -->
		{#if $settings?.show_debug}
			<div class="mt-8 pt-6 border-t border-slate-700/50">
				<h4 class="text-sm font-semibold mb-3 opacity-70">Debug Controls</h4>
				<div class="flex flex-wrap gap-2 items-center mb-4">
					<button
						class="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
						onclick={() => wsManager?.ping()}
					>
						Ping
					</button>
					<button
						class="px-3 py-2 bg-red-600 hover:bg-red-500 rounded text-sm font-medium transition-colors"
						onclick={resetGame}
					>
						Reset Game
					</button>
					<span class="mx-2 opacity-50">|</span>
					<button
						class="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium transition-colors"
						onclick={addBot}
					>
						Add Bot
					</button>
					<button
						class="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 rounded text-sm font-medium transition-colors"
						onclick={() => addBots(2)}
					>
						Add 2 Bots
					</button>
					<button
						class="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm font-medium transition-colors"
						onclick={killAllBots}
					>
						Kill All Bots
					</button>
				</div>

				{#if bots.length > 0}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
						{#each bots as b}
							<div class="flex items-center justify-between bg-slate-700/40 rounded-md px-3 py-2">
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
</div>
