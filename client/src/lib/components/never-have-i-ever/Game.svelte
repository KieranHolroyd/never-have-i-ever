<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { LocalPlayer } from '$lib/player';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { Status, VoteOptions, type Player, type Catagories } from '$lib/types';
	import ConnectionInfoPanel from './ConnectionInfoPanel.svelte';
	import PreGameConnection from './PreGameConnection.svelte';
	import { toast } from '$lib/toast';
	import Tutorial from '../Tutorial.svelte';
	import { colour_map } from '$lib/colour';
	import History from './History.svelte';
	import { settingsStore } from '$lib/settings';
    import { fade, fly } from 'svelte/transition';
    import { flip } from 'svelte/animate';
    import { backOut, quintOut } from 'svelte/easing';

	import MdiUndoVariant from '~icons/mdi/undo-variant';
	import MdiListBox from '~icons/mdi/list-box';
	import MdiShareOutline from '~icons/mdi/share-outline';

	interface Props {
		id: string;
		catagories: Catagories | undefined;
	}

	let { id, catagories = $bindable() }: Props = $props();

	let error: string | null = $state(null);
	let should_reload_on_reconnect = $state(false);

	let settings = settingsStore;

	let connection: Status = $state(Status.CONNECTING);
	let player_id: string | null = null;
	let errors: any[] = $state([]);
	let players: Player[] = $state([]);

	// ping stuff
	let prev_ping_ts = 0; //ms (epoch)
	let client_ping = $state(0); //ms
	let ping_timeout: ReturnType<typeof setInterval> | null;
	let last_pong = 0; //ms

	let my_name = LocalPlayer.name;

	let current_question: {
		content: string;
		catagory: string;
	} | null = $state(null);
	let conf_reset_display = $state(false);
	let categories_click = $state(false);

	let game_state: {
		catagory_select: boolean;
		game_completed: boolean;
		waiting_for_players: boolean;
		current_catagory: string[];
		history: any[];
	} = $state({
		catagory_select: true,
		game_completed: false,
		waiting_for_players: false,
		current_catagory: [],
		history: []
	});

	let round_timeout: number = $state(0);
	let timeout_start: number = $state(0);
	let timeout_duration: number = $state(0);
	let timeout_interval: ReturnType<typeof setInterval> | null = $state(null);
	const current_round: {
		votes: {
			player: {
				id: string;
				name: string;
				score: number;
				voted_this_round: boolean;
			};
			voted: string;
		}[];
	} = {
		votes: []
	};

	const share_data = {
		title: 'Never Have I Ever ~ games.kieran.dev',
		text: 'play Never Have I Ever with me!',
		url: `https://games.kieran.dev/play/${id}/never-have-i-ever`
	};

	async function share_game() {
		if (navigator.share) {
			await navigator.share(share_data);
		} else {
			await navigator.clipboard.writeText(share_data.url);
			toast.success('Copied game link to clipboard');
		}
	}

	function reload_page() {
		window.location.reload();
	}

	onMount(() => {
		if (LocalPlayer.name === null) return goto(`/play/name?redirect=/play/${id}/never-have-i-ever`);
		player_id = LocalPlayer.id;
		setupsock();

		if (catagories === undefined) {
			fetch(`${env.PUBLIC_API_URL}api/catagories`)
				.then((res) => res.json() as Promise<Catagories>)
				.then((data) => {
					catagories = data;
				})
				.catch((err) => {
					console.error(err);
					error = 'Failed to fetch catagories';
				});
		}

		return () => {
			socket?.close(4000);
			socket = null;
			if (timeout_interval) {
				clearInterval(timeout_interval);
				timeout_interval = null;
			}
			if (ping_timeout) {
				clearInterval(ping_timeout);
				ping_timeout = null;
			}
			if (reconnect_timeout) {
				clearTimeout(reconnect_timeout);
				reconnect_timeout = null;
			}
			if (connection_timeout) {
				clearTimeout(connection_timeout);
				connection_timeout = null;
			}
			round_timeout = 0;
			timeout_start = 0;
			timeout_duration = 0;
		};
	});

	onDestroy(() => {
		if (reconnect_timeout) {
			clearTimeout(reconnect_timeout);
			reconnect_timeout = null;
		}
		if (connection_timeout) {
			clearTimeout(connection_timeout);
			connection_timeout = null;
		}
	});

	function conf_reset() {
		conf_reset_display = true;
		setTimeout(() => {
			conf_reset_display = false;
		}, 2500);
	}

	function toggleSelection(catagory: string) {
		let newState = game_state;

		if (!newState.current_catagory.includes(catagory)) newState.current_catagory.push(catagory);
		else newState.current_catagory.splice(newState.current_catagory.indexOf(catagory), 1);

		game_state = { ...newState };
	}
	function confirmSelections() {
		if (game_state.current_catagory.length > 0) {
			socket?.send(JSON.stringify({ op: 'confirm_selections' }));
			socket?.send(JSON.stringify({ op: 'next_question' }));
		} else {
			error = 'You must select at least one catagory';
			setTimeout(() => {
				error = null;
			}, 2500);
		}
	}
	function selectCatagories() {
		socket?.send(JSON.stringify({ op: 'select_catagories' }));
	}
	function selectQuestion() {
		socket?.send(JSON.stringify({ op: 'next_question' }));
	}
	function reset() {
		socket?.send(JSON.stringify({ op: 'reset_game' }));
		conf_reset_display = false;

		// Clear timeout on reset
		if (timeout_interval) {
			clearInterval(timeout_interval);
			timeout_interval = null;
		}
		round_timeout = 0;
		timeout_start = 0;
		timeout_duration = 0;
	}

	function emitSelectCatagory(catagory: string) {
		socket?.send(JSON.stringify({ op: 'select_catagory', catagory }));
	}

    function vote(option: VoteOptions) {
        console.log('[DEBUG] Voting:', option);
        socket?.send(JSON.stringify({ op: 'vote', option }));
        if (browser && 'vibrate' in navigator) {
            try { (navigator as any).vibrate?.(10); } catch {}
        }
    }

	// Debug function for browser console
	function debugGameState() {
		console.log('[DEBUG] Current game state:', {
			game_state,
			timeout_start,
			timeout_duration,
			round_timeout,
			timeout_interval: timeout_interval ? 'active' : 'inactive',
			current_question,
			players
		});
	}

	// Make debug function available globally
	if (browser) {
		(window as any).debugGameState = debugGameState;
	}

	/// WEBSOCKET STUFF
	let socket: WebSocket | null = null;
	let retry_count = 0;
	let reconnect_timeout: ReturnType<typeof setTimeout> | null = null;
	let connection_timeout: ReturnType<typeof setTimeout> | null = null;
	let reconnect_scheduled = false;
	let reconnect_inflight = false;
	function setupsock() {
		// Prevent attaching duplicate listeners to an existing socket
		if (socket !== null) return;
		const sock_url = env.PUBLIC_SOCKET_URL ?? 'ws://localhost:3000/';
		const sock_params = `?playing=never-have-i-ever&game=${id}&player=${player_id}`;
		try {
			socket = new WebSocket(sock_url + sock_params);
		} catch (e) {
			console.log(`[DEBUG] Failed to create socket: ${e}`);
			scheduleReconnect();
		}

		// CRITICAL: Attach event listeners IMMEDIATELY after creating WebSocket
		// If WebSocket fails immediately, we need listeners ready to catch the error

		// Attach all event listeners immediately after creating socket
		// message is received
		socket?.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data);
				switch (data.op) {
					case 'open':
						connection = Status.CONNECTED;
						measure_ping();

						// Check if this is a post-deployment reconnection
						if (data.postDeploymentReconnect && should_reload_on_reconnect) {
							console.log('[DEBUG] Post-deployment reconnection detected, reloading page...');
							setTimeout(() => {
								window.location.reload();
							}, 1000); // Small delay to ensure connection is stable
							should_reload_on_reconnect = false; // Reset flag
						}
						break;
					case 'game_state':
						console.log('[DEBUG] Game state received:', {
							waiting_for_players: data.game.waiting_for_players,
							timeout_start: data.game.timeout_start,
							timeout_duration: data.game.timeout_duration,
							current_timeout_start: timeout_start,
							current_timeout_duration: timeout_duration,
							players: data.game.players
						});

						game_state.current_catagory = data.game.catagories;
						game_state.catagory_select = data.game.catagory_select;
						game_state.game_completed = data.game.game_completed;
						game_state.waiting_for_players = data.game.waiting_for_players || false;
						game_state.history = data.game.history;

						current_question = data.game.current_question;

						// Handle server-synced timeout (starts when first vote is cast)
						if (
							game_state.waiting_for_players &&
							data.game.timeout_start !== undefined &&
							data.game.timeout_duration
						) {
							console.log(
								'[DEBUG] Setting timeout:',
								data.game.timeout_start,
								data.game.timeout_duration
							);
							timeout_start = data.game.timeout_start;
							timeout_duration = data.game.timeout_duration;

							// Start or update countdown
							if (!timeout_interval) {
								console.log('[DEBUG] Starting countdown interval');
								timeout_interval = setInterval(() => {
									const elapsed = Date.now() - timeout_start;
									const remaining = Math.max(0, Math.ceil((timeout_duration - elapsed) / 1000));
									round_timeout = remaining;

									console.log('[DEBUG] Countdown:', remaining, 'seconds remaining');

									if (remaining <= 0) {
										console.log('[DEBUG] Countdown finished');
										if (timeout_interval) {
											clearInterval(timeout_interval);
											timeout_interval = null;
										}
									}
								}, 100); // Update more frequently for smoother countdown
							}
						} else if (!game_state.waiting_for_players && timeout_interval) {
							console.log('[DEBUG] Clearing timeout interval');
							clearInterval(timeout_interval);
							timeout_interval = null;
							round_timeout = 0;
							timeout_start = 0;
							timeout_duration = 0;
						}
						players = data.game.players;
						break;
					case 'new_round':
						current_round.votes = [];
						if (browser) {
							window.navigator.vibrate([100, 50, 100]);
						}
						break;
					case 'vote_cast':
						current_round.votes = [
							...current_round.votes,
							{ player: data.player, voted: data.vote }
						];
						break;
					case 'error':
						errors = [...errors, data];
						break;
					case 'github_push':
					setTimeout(() => {
						if (data.showReloadButton) {
							toast.info(data.notification, {
								action: { label: 'Reload', onClick: reload_page },
								// Slightly longer so users can act
								duration: 6000
							});
						} else {
							toast.info(data.notification);
						}
					}, data.delay);
						// Set flag to reload when we reconnect after deployment
						should_reload_on_reconnect = true;
						break;
					case 'round_timeout':
						console.log('[DEBUG] Round timeout received:', data.message);
					toast.info(data.message, { duration: 3000 });

						// Clear timeout state when timeout occurs
						if (timeout_interval) {
							clearInterval(timeout_interval);
							timeout_interval = null;
						}
						round_timeout = 0;
						timeout_start = 0;
						timeout_duration = 0;
						break;
					case 'pong':
						const multi_diff = performance.now() - prev_ping_ts;

						if (client_ping !== 0) {
							client_ping = client_ping * 0.8 + multi_diff * 0.2; // 5 frame average
						} else {
							client_ping = multi_diff;
						}
						last_pong = performance.now();
						break;
					default:
						console.log('unhandled');
					// console.log(data);
				}
			} catch (e) {
				console.log(e);
			}
		});

		// socket opened
		socket?.addEventListener('open', (event) => {
			socket?.send(JSON.stringify({ op: 'join_game', create: true, playername: my_name }));
			retry_count = 0;
			// Clear any pending timeouts on successful connection
			if (reconnect_timeout) {
				clearTimeout(reconnect_timeout);
				reconnect_timeout = null;
			}
			if (connection_timeout) {
				clearTimeout(connection_timeout);
				connection_timeout = null;
			}
			reconnect_scheduled = false;
			reconnect_inflight = false;
		});

		// socket closed
		socket?.addEventListener('close', (event) => {
			connection = Status.DISCONNECTED;
			if (ping_timeout) {
				clearInterval(ping_timeout);
				ping_timeout = null;
			}
			if (connection_timeout) {
				clearTimeout(connection_timeout);
				connection_timeout = null;
			}

			reconnect_inflight = false;
			if (event.code === 1006) {
				scheduleReconnect();
				return (error = 'Failed to connect to server, malformed request');
			}
			if (event.code !== 1000) {
				scheduleReconnect();
			}
		});

		// error handler
		socket?.addEventListener('error', (event) => {
			connection = Status.DISCONNECTED;
			if (ping_timeout) {
				clearInterval(ping_timeout);
				ping_timeout = null;
			}
			if (connection_timeout) {
				clearTimeout(connection_timeout);
				connection_timeout = null;
			}

			reconnect_inflight = false;
			// Trigger reconnect on connection errors
			scheduleReconnect();
		});

		// Set connection timeout AFTER all event listeners are attached
		connection_timeout = setTimeout(() => {
			console.log('[DEBUG] Connection timeout - server unreachable');
			if (socket && socket.readyState === WebSocket.CONNECTING) {
				console.log('[DEBUG] Force closing stuck WebSocket');

				reconnect_inflight = false;
				socket.close();
				scheduleReconnect();
			} else {
				console.log('[DEBUG] Connection timeout cleared - WebSocket state:', socket?.readyState);
			}
		}, 10000);

		function scheduleReconnect() {
			// Avoid multiple scheduled reconnects
			if (reconnect_scheduled || reconnect_inflight) return;
			retry_count = retry_count + 1;

			// Calculate delay based on requirements:
			// - 10 seconds for first 2 minutes (12 attempts)
			// - Then exponential backoff with 2x multiplier
			// - Max delay of 5 minutes
			let delay: number;

			if (retry_count <= 12) {
				// First 2 minutes: fixed 10-second intervals
				delay = 10000; // 10 seconds
			} else {
				// After 2 minutes: exponential backoff
				const backoffAttempts = retry_count - 12;
				delay = 10000 * Math.pow(2, backoffAttempts); // Start at 20s, then 40s, 80s, etc.
				delay = Math.min(delay, 300000); // Cap at 5 minutes
			}

			// Stop after 30 attempts total
			if (retry_count >= 30) {
				console.log('[DEBUG] Max reconnect attempts (30) reached, giving up');
				error = 'Failed to reconnect to server after multiple attempts';
				return;
			}

			reconnect_scheduled = true;
			console.log(`[DEBUG] Scheduling reconnect attempt ${retry_count} in ${delay / 1000}s`);

			reconnect_timeout = setTimeout(() => {
				reconnect_scheduled = false;
				performReconnect();
			}, delay);
		}

		function performReconnect() {
			if (reconnect_inflight) return;
			reconnect_inflight = true;
			console.log(`[DEBUG] Performing reconnect attempt ${retry_count}`);
			try {
				socket?.close();
			} catch (_) {}
			socket = null;
			if (ping_timeout) {
				clearInterval(ping_timeout);
				ping_timeout = null;
			}
			if (connection_timeout) {
				clearTimeout(connection_timeout);
				connection_timeout = null;
			}
			connection = Status.CONNECTING;

			try {
				setupsock();
			} catch (e) {
				console.log(`[DEBUG] Failed to reconnect: ${e}`);
				scheduleReconnect();
			}
		}

		// Cleanup function for reconnect timeout
		function cleanup() {
			if (reconnect_timeout) {
				clearTimeout(reconnect_timeout);
				reconnect_timeout = null;
			}
		}
	}

	// Reconnect when browser comes back online or tab becomes visible
	if (browser) {
		window.addEventListener('online', () => {
			if (connection !== Status.CONNECTED) {
				console.log('[DEBUG] Online event - attempting immediate reconnect');
				retry_count = Math.max(0, retry_count - 1); // be a bit forgiving after regaining network
				// Try immediately without waiting for backoff
				if (reconnect_timeout) {
					clearTimeout(reconnect_timeout);
					reconnect_timeout = null;
				}
				reconnect_scheduled = false;
				performImmediateReconnect();
			}
		});
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				if (!socket || socket.readyState !== WebSocket.OPEN) {
					console.log('[DEBUG] Tab visible - attempting reconnect');
					performImmediateReconnect();
				}
			}
		});

		function performImmediateReconnect() {
			if (reconnect_inflight) return;
			reconnect_inflight = true;
			try {
				socket?.close();
			} catch (_) {}
			socket = null;
			if (ping_timeout) {
				clearInterval(ping_timeout);
				ping_timeout = null;
			}
			if (connection_timeout) {
				clearTimeout(connection_timeout);
				connection_timeout = null;
			}
			connection = Status.CONNECTING;
			setupsock();
		}
	}

	function measure_ping() {
		prev_ping_ts = performance.now();

		socket?.send(JSON.stringify({ op: 'ping' }));
		if (!ping_timeout) {
			ping_timeout = setInterval(measure_ping, 1000);
		}
	}

	// function check_connection() {
	// 	const time_since_last_pong = performance.now() - last_pong;
	// 	if (time_since_last_pong > 2_000) {
	// 		connection = Status.CONNECTING;
	// 	} else {
	// 		if (connection !== Status.CONNECTED) {
	// 			connection = Status.CONNECTED;
	// 		}
	// 	}
	// 	// Kill connections after 10 sec inactivity
	// 	if (time_since_last_pong > 4_000) {
	// 		socket?.close();
	// 		socket = null;
	// 		setupsock();
	// 		last_pong = performance.now();
	// 	}
	// }
	// setInterval(check_connection, 250);
	/// ----------------
</script>

<div
	class="dark:text-white text-black text-center min-h-screen px-3 pb-[calc(env(safe-area-inset-bottom)+8.5rem)]"
>
	{#if !game_state.game_completed}
		{#if game_state.catagory_select}
			<div class="mx-auto mt-4 prose-panel lg:prose-lg xl:prose-xl" in:fade={{ duration: 260, easing: quintOut }}>
				<h1>New Game</h1>
			</div>
			<div class="z-10 w-full max-w-md mx-auto mt-6 columns-1 dark:text-white panel rounded-t-xl" in:fade={{ duration: 260, easing: quintOut }}>
				<div in:fly={{ y: 10, duration: 300, easing: backOut }}>
					<p class="text-xl font-semibold py-2 bg-slate-900/60 rounded-t-xl">Select Catagories</p>
					{#if catagories !== undefined}
						<div class="max-h-96 overflow-auto">
							{#each Object.entries(catagories) as [catagory_name, catagory], index (catagory_name)}
							{#if catagory.flags.is_nsfw && $settings?.no_nsfw}
								<span></span>
							{:else if catagory.flags.is_hidden && !$settings?.show_hidden}
								<span></span>
							{:else}
								<label class="my-[2px]">
											<div
												class="py-1 px-4 w-full text-left text-lg capitalize font-semibold hover:bg-slate-700/50 duration-75"
												in:fly={{ y: 6, duration: 260, delay: Math.min(index * 18, 300), easing: quintOut }}
											>
										<input
											type="checkbox"
											class=""
											checked={game_state.current_catagory.includes(catagory_name)}
											onchange={() => emitSelectCatagory(catagory_name)}
										/>
										<span class="float-right">
											{#if catagory.flags.is_nsfw}
												<span class="text-xs mr-2 p-1 bg-red-700 text-white rounded"> NSFW </span>
											{/if}
											{catagory_name}
										</span>
									</div>
								</label>
							{/if}
							{/each}
						</div>
					{:else}
						<p>Loading...</p>
					{/if}
				</div>
			</div>
			<button
				class="rounded-none transition bg-emerald-500 text-white font-semibold py-2 px-4 hover:bg-emerald-400 w-full max-w-md mx-auto rounded-b-xl shadow hover:shadow-xl"
				onclick={() => confirmSelections()}
				in:fade={{ duration: 220, delay: 140, easing: quintOut }}
			>
				Continue
			</button>
			<PreGameConnection {connection} {players} />
            <Tutorial
                id="welcome"
                steps={[
                    { title: 'Welcome', content: 'Play Never Have I Ever with friends in real-time. No accounts needed.' },
                    { title: 'Pick categories', content: 'Choose one or more categories to tailor the questions to your group.' },
                    { title: 'How rounds work', content: 'A question appears. Everyone votes: Have, Kinda, or Have Not.' },
                    { title: 'Scoring', content: 'Have = +1, Kinda = +0.5, Have Not = 0. Highest score wins, but fun matters most.' }
                ]}
            />
			<!-- Removed local overlay popup in favor of global toasts -->
		{:else}
            {#if current_question?.content !== undefined}
                {#key current_question?.content}
                <div class="panel card" in:fade={{ duration: 180, easing: quintOut }}>
                    <div in:fly={{ y: 8, duration: 220, easing: backOut }}>
                        <p class="m-0 text-xs uppercase font-bold" data-testid="question-category">
                            Catagory: {current_question?.catagory}
                        </p>
                        <p class="relative text-lg my-1 p-1" data-testid="question-content">
                            {current_question?.content}
                        </p>
                    </div>
                </div>
                {/key}
				{#if error}
					<p class="text-red-700">{error}</p>
				{/if}
                <div class="panel card">
					<p class="panel-heading">Players</p>
                    {#each players.filter((p) => p.connected) as player, index (player.id)}
						<div
                            class={`relative my-1 p-1 font-bold text ${colour_map[player.this_round.vote]} transition-colors duration-300 ease-out`}
                            in:fly={{ y: 6, duration: 220, delay: Math.min(index * 25, 300), easing: quintOut }} animate:flip
							data-testid={`player-${player.name}`}
						>
							{player.name}: {player.this_round.vote ?? 'Not Voted'}
							<div
								class="absolute text-xs leading-[1.825] top-1 right-1 bg-red-600 border border-white rounded-full text-white min-w-[1.5rem] h-6 px-1"
								data-testid={`player-score-${player.name}`}
							>
								{player.score}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<h2>Choose a question</h2>
			{/if}
			{#if game_state.waiting_for_players}
                <div
                    class="panel card mt-4 bg-yellow-100/70 dark:bg-yellow-900/60 border-yellow-400 dark:border-yellow-600"
                    in:fade={{ duration: 140, easing: quintOut }}
                >
					<div class="text-center">
						<h3 class="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
							Round in Progress
						</h3>
						<div class="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
							{players?.filter((p) => p.connected && p.this_round.voted).length || 0} / {players?.filter(
								(p) => p.connected
							).length || 0} players voted
						</div>
						{#if timeout_start === 0}
							<div class="text-xs text-yellow-600 dark:text-yellow-400">
								Timer starts when first player votes
							</div>
						{:else if round_timeout > 0}
							<div class="text-xs text-yellow-600 dark:text-yellow-400">
								Auto-proceed in {round_timeout}s • Skip available when all voted
							</div>
						{:else}
							<div class="text-xs text-yellow-600 dark:text-yellow-400">
								Processing next question...
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Debug Info -->
			{#if $settings?.show_debug}
				<div class="panel card mb-2 p-2 text-left text-xs">
					<div>Timer: {round_timeout}s | Start: {timeout_start} | Duration: {timeout_duration}</div>
					<div>
						Waiting: {game_state.waiting_for_players} | Interval: {timeout_interval
							? 'active'
							: 'inactive'}
					</div>
					<button
						class="mt-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
						onclick={debugGameState}
					>
						Debug State
					</button>
				</div>
			{/if}

			<!-- Restyled Action Bar -->
			<div class="fixed bottom-0 left-0 w-full z-30" in:fly={{ y: 32, duration: 320, easing: quintOut }}>
				<div
					class="w-full grid grid-cols-9 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700/60"
				>
                    <button
                        class="col-span-3 text-white text-2xl md:text-3xl font-semibold py-3 transition-all duration-200 ease-out hover:text-emerald-300 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring focus-visible:ring-emerald-400/40 hover:shadow-[0_8px_24px_-12px_rgba(16,185,129,0.6)]"
						onclick={() => vote(VoteOptions.Have)}
						data-testid="have-button"
					>
						Have
					</button>
                    <button
                        class="col-span-3 text-white text-2xl md:text-3xl font-semibold py-3 border-x border-slate-700/60 transition-all duration-200 ease-out hover:text-sky-300 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring focus-visible:ring-sky-400/40 hover:shadow-[0_8px_24px_-12px_rgba(56,189,248,0.6)]"
						onclick={() => vote(VoteOptions.Kinda)}
					>
						Kinda
					</button>
                    <button
                        class="col-span-3 text-white text-2xl md:text-3xl font-semibold py-3 transition-all duration-200 ease-out hover:text-rose-300 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring focus-visible:ring-rose-400/40 hover:shadow-[0_8px_24px_-12px_rgba(244,63,94,0.6)]"
						onclick={() => vote(VoteOptions.HaveNot)}
						data-testid="have-not-button"
					>
						Have not
					</button>
				</div>
				<div
					class="w-full grid grid-cols-9 bg-slate-900/80 backdrop-blur-sm pb-[max(env(safe-area-inset-bottom),0.5rem)]"
				>
					<button
						class="col-span-2 text-white bg-slate-700 hover:bg-rose-500 text-xl md:text-2xl py-3"
						onclick={() => conf_reset()}
					>
						<MdiUndoVariant class="w-7 h-7 mx-auto" />
					</button>
					<button
						class="col-span-5 text-white bg-emerald-600 hover:bg-emerald-500 text-3xl md:text-5xl py-4"
						onclick={() => selectQuestion()}
						disabled={game_state.waiting_for_players &&
							(players?.filter((p) => p.connected && p.this_round.voted).length || 0) !==
								(players?.filter((p) => p.connected).length || 1)}
					>
						{#if game_state.waiting_for_players}
							{#if (players?.filter((p) => p.connected && p.this_round.voted).length || 0) === (players?.filter((p) => p.connected).length || 1)}
								Skip Round
							{:else}
								Waiting for Votes
							{/if}
						{:else}
							Next Question
						{/if}
					</button>
					<button
						class="col-span-2 text-white bg-slate-700 hover:bg-slate-600 text-xl md:text-2xl py-3"
						ondblclick={() => selectCatagories()}
						onclick={() => {
							categories_click = true;
							setTimeout(() => (categories_click = false), 1000);
						}}
					>
						<MdiListBox class="w-7 h-7 mx-auto" />
					</button>
				</div>
			</div>

			{#if !$settings.no_tutorials}
				<div
					class={`fixed bottom-4 right-4 z-50 py-2 px-4 rounded-md bg-gray-200 dark:bg-gray-800 border-t-2 dark:border-gray-600 border-gray-200 shadow pointer-events-none ${
						categories_click ? 'opacity-40' : 'opacity-0'
					} overflow-hidden transition-all duration-200`}
				>
					<p>Double Click</p>
				</div>
			{/if}
            <Tutorial
                id="ingame"
                steps={[
                    { title: 'Vote quickly', content: 'When a question appears, tap your answer. The next round can start once everyone has voted.' },
                    { title: 'Anyone can drive', content: 'Any player can skip to the next question, reset, or reopen category selection.' },
                    { title: 'Have fun', content: 'Keep it light. The scoreboard is for laughs.' }
                ]}
            />
			<ConnectionInfoPanel {connection} {players} {errors} />
		{/if}
	{:else}
		<h1 class="text-2xl font-semibold dark:text-white">There are no more questions</h1>
		{#each players as player}
			<p class="mx-auto max-w-lg p-3">
				<b>{player.name}</b> has {player.score} points
			</p>
		{/each}

		<History history={game_state.history} />
		<button onclick={() => reset()}>Reset Game</button>
	{/if}
	{#if conf_reset_display}
		<button class="red-button mt-4" onclick={() => reset()}>Confirm Reset</button>
	{/if}
	<!-- Global toasts replace per-page notification overlays -->
	{#if connection === Status.CONNECTED}
		<div
			class="fixed text-xs w-[3.25rem] pointer-events-none top-[11.5rem] left-2.5 rounded-full py-0.5 px-1 bg-gray-200/80 dark:bg-gray-600/80 backdrop-blur-sm"
		>
			<span class="dark:text-white text-black">{client_ping.toFixed(0)}ms</span>
		</div>
	{/if}
</div>
<div class="fixed z-20 top-[7.5rem] left-2">
	<button class="relative rounded-full p-2 panel duration-200" title="Share!" onclick={share_game}>
		<MdiShareOutline class="dark:text-white h-8 w-8" />
	</button>
</div>
