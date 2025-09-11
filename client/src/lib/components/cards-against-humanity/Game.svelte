<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { env } from '$env/dynamic/public';
    import { LocalPlayer } from '$lib/player';
    import { Status, type CAHGameState, type CAHPlayer } from '$lib/types';
    import { settingsStore } from '$lib/settings';
    import { v4 as uuidv4 } from 'uuid';

	interface Props {
		id: string;
		selectedPackIds?: string[];
	}
	let { id, selectedPackIds }: Props = $props();

	let socket: WebSocket | null = null;
	let connection: Status = $state(Status.CONNECTING);
	let gameState: CAHGameState | null = $state(null);
	let currentPlayer: CAHPlayer | null = $state(null);
	let error: string | null = $state(null);
	let packsSelected = $state(false);

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
            try { b.socket?.close(); } catch (_) {}
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
                    create: true,
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
                        if (g.currentRound !== bot.lastSubmittedRound) {
                            const pick = g.currentBlackCard?.pick ?? 1;
                            const hand = [...(me.hand || [])];
                            if (hand.length >= pick) {
                                // pick random unique cards
                                const chosenIds: string[] = [];
                                for (let i = 0; i < pick; i++) {
                                    const idx = Math.floor(Math.random() * hand.length);
                                    const card = hand.splice(idx, 1)[0];
                                    if (card) chosenIds.push(card.id);
                                }
                                bot.socket?.send(
                                    JSON.stringify({ op: 'submit_cards', cardIds: chosenIds })
                                );
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

	function connect() {
		if (socket) return;
		const sock_url = env.PUBLIC_SOCKET_URL ?? 'ws://localhost:3000/';
		const sock_params = `?playing=cards-against-humanity&game=${id}&player=${LocalPlayer.id}`;
		try {
			socket = new WebSocket(sock_url + sock_params);
		} catch (e) {
			error = 'Failed to create WebSocket';
			return;
		}

		socket.addEventListener('open', () => {
			connection = Status.CONNECTED;
			socket?.send(
				JSON.stringify({
					op: 'join_game',
					create: true,
					playername: LocalPlayer.name
				})
			);

			// Send selected packs if available
			if (selectedPackIds && selectedPackIds.length > 0 && !packsSelected) {
				setTimeout(() => {
					socket?.send(
						JSON.stringify({
							op: 'select_packs',
							packIds: selectedPackIds
						})
					);
					packsSelected = true;
				}, 500);
			}
		});

		socket.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data);

				switch (data.op) {
					case 'game_state':
						gameState = data.game;
						currentPlayer = gameState?.players.find((p) => p.id === LocalPlayer.id) || null;
						break;

					case 'error':
						error = data.message;
						break;

					case 'pong':
						// Handle ping response
						break;

					default:
						console.log('Unhandled message:', data.op, data);
				}
			} catch (e) {
				console.error('Failed to parse WebSocket message:', e);
			}
		});

		socket.addEventListener('close', () => {
			connection = Status.DISCONNECTED;
		});

		socket.addEventListener('error', () => {
			connection = Status.DISCONNECTED;
			error = 'WebSocket error';
		});
	}

	function sendMessage(op: string, data: any = {}) {
		if (socket && connection === Status.CONNECTED) {
			socket.send(JSON.stringify({ op, ...data }));
		}
	}

	function submitCards(cardIds: string[]) {
		sendMessage('submit_cards', { cardIds });
	}

	function selectWinner(winnerPlayerId: string) {
		sendMessage('select_winner', { winnerPlayerId });
	}

	function resetGame() {
		sendMessage('reset_game');
	}

	onMount(() => {
		connect();
		return () => {
			socket?.close();
			socket = null;
		};
	});

	onDestroy(() => {
		try {
			socket?.close();
		} catch (_) {}
		socket = null;
        // Clean up bot sockets
        bots.forEach((b) => {
            try { b.socket?.close(); } catch (_) {}
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
				</span>
			</div>
		</div>

		{#if error}
			<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
				<p class="text-red-400">{error}</p>
			</div>
		{/if}

		{#if gameState}
			<!-- Game Phase Display -->
			<div class="mb-6">
				<div class="flex items-center justify-between">
					<div class="text-lg font-semibold">
						Round {gameState.currentRound} / {gameState.maxRounds}
					</div>
					<div class="text-sm opacity-70">
						Phase: <span class="capitalize">{gameState.phase.replace('_', ' ')}</span>
					</div>
				</div>
			</div>

			<!-- Players List -->
			<div class="mb-6">
				<h3 class="text-lg font-semibold mb-3">
					Players ({gameState.players.filter((p) => p.connected).length})
				</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					{#each gameState.players.filter((p) => p.connected) as player}
						<div class="bg-slate-700/50 rounded-lg p-3 text-center">
							<div class="font-semibold">{player.name}</div>
							<div class="text-sm opacity-70">Score: {player.score}</div>
							{#if player.isJudge}
								<div class="text-xs text-yellow-400 font-medium mt-1">Judge</div>
							{/if}
							{#if player.id === LocalPlayer.id}
								<div class="text-xs text-blue-400 font-medium mt-1">(You)</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Current Black Card -->
			{#if gameState.currentBlackCard}
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-3">Black Card</h3>
					<div class="bg-black text-white rounded-lg p-4 text-center">
						<p class="text-lg">{gameState.currentBlackCard.text}</p>
						{#if gameState.currentBlackCard.pick > 1}
							<p class="text-sm opacity-70 mt-2">Pick {gameState.currentBlackCard.pick} cards</p>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Game Content Based on Phase -->
			{#if gameState.phase === 'waiting'}
				<div class="text-center py-8">
					<p class="text-lg opacity-70 mb-4">
						{#if gameState.waitingForPlayers}
							Waiting for more players to join...
						{:else}
							Waiting to start the game...
						{/if}
					</p>
					{#if gameState.players.filter((p) => p.connected).length >= 3}
						<p class="text-sm opacity-60">The game will start automatically when ready.</p>
					{:else}
						<p class="text-sm opacity-60">Need at least 3 players to start.</p>
					{/if}
				</div>
			{:else if gameState.phase === 'selecting' && currentPlayer && !currentPlayer.isJudge}
				<!-- Card Selection Phase -->
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-3">Your Hand ({currentPlayer.hand.length} cards)</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
						{#each currentPlayer.hand as card}
							<button
								class="bg-white text-black rounded-lg p-4 hover:bg-gray-100 transition-colors text-left w-full"
								onclick={() => submitCards([card.id])}
							>
								<p>{card.text}</p>
							</button>
						{/each}
					</div>
					<p class="text-sm opacity-60 mt-3">Click a card to submit it for this round.</p>
				</div>
			{:else if gameState.phase === 'judging' && currentPlayer?.isJudge}
				<!-- Judging Phase -->
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-3">Submitted Cards</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
						{#each gameState.submittedCards as submission}
							<button
								class="bg-white text-black rounded-lg p-4 hover:bg-gray-100 transition-colors text-left w-full"
								onclick={() => selectWinner(submission.playerId)}
							>
								{#each submission.cards as card}
									<p class="mb-2">{card.text}</p>
								{/each}
								<p class="text-sm text-gray-600 mt-2">- {submission.playerName}</p>
							</button>
						{/each}
					</div>
					<p class="text-sm opacity-60 mt-3">Click the best card combination to select a winner.</p>
				</div>
			{:else if gameState.phase === 'judging' && !currentPlayer?.isJudge}
				<!-- Waiting for Judge -->
				<div class="text-center py-8">
					<p class="text-lg opacity-70">Waiting for the judge to select a winner...</p>
					<div class="mt-4">
						<div class="inline-grid grid-cols-2 gap-3">
							{#each gameState.submittedCards as submission}
								<div class="bg-slate-700/50 rounded-lg p-4">
									{#each submission.cards as card}
										<p class="mb-2">{card.text}</p>
									{/each}
									<p class="text-sm opacity-60 mt-2">Submitted by {submission.playerName}</p>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{:else if gameState.phase === 'scoring'}
				<!-- Scoring Phase -->
				<div class="text-center py-8">
					{#if gameState?.roundWinner}
						{@const winnerName = gameState.players.find((p) => p.id === gameState?.roundWinner)?.name || 'Unknown'}
						<div class="mb-4">
							<h3 class="text-xl font-bold text-green-400">Round Winner!</h3>
							<p class="text-lg mt-2">
								{winnerName} gets a point!
							</p>
						</div>
					{/if}
					<p class="text-sm opacity-60">Next round starting soon...</p>
				</div>
			{:else if gameState.phase === 'game_over'}
				<!-- Game Over -->
				<div class="text-center py-8">
					<h3 class="text-2xl font-bold text-yellow-400 mb-4">Game Over!</h3>
					<div class="mb-6">
						{#each gameState.players
							.filter((p) => p.connected)
							.sort((a, b) => b.score - a.score) as player, i}
							<div class="flex items-center justify-between bg-slate-700/50 rounded-lg p-3 mb-2">
								<div class="flex items-center gap-3">
									<span class="text-lg font-bold">#{i + 1}</span>
									<span class="font-semibold">{player.name}</span>
									{#if player.id === LocalPlayer.id}
										<span class="text-sm text-blue-400">(You)</span>
									{/if}
								</div>
								<span class="text-lg font-bold">{player.score} points</span>
							</div>
						{/each}
					</div>
				</div>
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
                        onclick={() => sendMessage('ping')}
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
