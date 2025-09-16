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
	}

    function handlePacksSelected(packs: string[]) {
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
                {#if (gameState.selectedPacks?.length || 0) === 0}
                    <div class="mb-6">
                        <h3 class="text-xl font-semibold mb-2">Select Card Packs</h3>
                        <p class="text-slate-400 mb-4">Choose which packs to include before the game starts.</p>
                        <CahCardPackSelection gameId={id} onPacksSelected={handlePacksSelected} />
                    </div>
                {:else}
                    <CahWaitingPhase {gameState} />
                {/if}
			{:else if gameState.phase === 'selecting' && currentPlayer && !currentPlayer.isJudge}
				<!-- Card Selection Phase -->
				<div class="mb-6">
					<div class="flex items-center justify-between mb-4">
						<div class="flex items-center gap-3">
							<h3 class="text-xl font-semibold">Your Hand</h3>
							<div class="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full text-sm text-blue-400 font-medium">
								<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
								{currentPlayer.hand.length} cards
							</div>
						</div>
						<div class="text-sm text-slate-400">
							Selected: {selectedCardIds.length} / {gameState.currentBlackCard?.pick ?? 1}
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
						{#each currentPlayer.hand as card, index}
							<button
								class="group relative rounded-lg p-4 transition-all duration-200 text-left w-full border-2 overflow-hidden
								{selectedCardIds.includes(card.id)
									? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-lg transform scale-105'
									: 'bg-white text-black hover:bg-gray-50 border-gray-300 hover:border-gray-400 hover:shadow-md'}"
								onclick={() => toggleSelectCard(card.id)}
								style="animation-delay: {index * 50}ms"
							>

								<!-- Selection Indicator -->
								{#if selectedCardIds.includes(card.id)}
									<div class="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
										<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
										</svg>
									</div>
								{/if}

								<!-- Card Content -->
								<div class="flex items-start gap-3">
									<div class="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
										<span class="text-xs font-bold text-white">{index + 1}</span>
									</div>
									<p class="text-sm leading-relaxed group-hover:text-gray-800 transition-colors">
										{card.text}
									</p>
								</div>

								<!-- Hover Effect -->
								<div class="absolute inset-0 bg-gradient-to-r from-emerald-400/0 to-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
							</button>
						{/each}
					</div>

					<!-- Action Bar -->
					<div class="bg-slate-800/50 rounded-lg p-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<div class="text-sm text-slate-400">
									Progress: {selectedCardIds.length} of {gameState.currentBlackCard?.pick ?? 1} selected
								</div>
								{#if selectedCardIds.length === (gameState.currentBlackCard?.pick ?? 1)}
									<div class="flex items-center gap-2 text-sm text-green-400">
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
										</svg>
										Ready to submit!
									</div>
								{:else if selectedCardIds.length > 0}
									<div class="flex items-center gap-2 text-sm text-blue-400">
										<svg class="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v4a1 1 0 102 0V9a1 1 0 00-1-1z" clip-rule="evenodd"/>
										</svg>
										{selectedCardIds.length} selected
									</div>
								{/if}
							</div>

							<div class="flex items-center gap-3">
								{#if selectedCardIds.length > 0}
									<button
										class="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-sm font-medium transition-colors duration-200"
										onclick={clearSelected}
									>
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"/>
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
										</svg>
										Clear All
									</button>
								{/if}

								<button
									class="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-lg text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
									onclick={() => submitCards()}
									disabled={selectedCardIds.length !== (gameState.currentBlackCard?.pick ?? 1)}
								>
									<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
									</svg>
									Submit Cards
								</button>
							</div>
						</div>
					</div>
				</div>
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
			<!-- Loading State -->
			<div class="text-center py-8">
				<p class="text-lg opacity-70">Connecting to game...</p>
			</div>
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
