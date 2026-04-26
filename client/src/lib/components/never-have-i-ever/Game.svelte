<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/state';
	import { buildSocketUrl } from '$lib/socket-url';
	import { LocalPlayer } from '$lib/player';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import {
		Status,
		VoteOptions,
		type Player,
		type Catagories,
		type NHIEGameState
	} from '$lib/types';
	import { clearStoredRoomPassword, getStoredRoomPassword, storeRoomPassword } from '$lib/room-password';
	import ConnectionInfoPanel from './ConnectionInfoPanel.svelte';
	import PreGameConnection from './PreGameConnection.svelte';
	import RoomPasswordGate from '../shared/RoomPasswordGate.svelte';
	import RoomPasswordSettings from '../shared/RoomPasswordSettings.svelte';
	import RoomCapacitySettings from '../shared/RoomCapacitySettings.svelte';
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
	import posthog from 'posthog-js';

	interface Props {
		id: string;
		catagories: Catagories | undefined;
		userId?: string;
	}

	let { id, catagories = $bindable(), userId }: Props = $props();

	function initialRoomProtected() {
		return Boolean((page.data as { game?: { passwordProtected?: boolean } }).game?.passwordProtected);
	}

	function initialMaxPlayers() {
		return (page.data as { game?: { maxPlayers?: number } }).game?.maxPlayers ?? 20;
	}

	function initialCreatorPlayerId() {
		return (page.data as { game?: { creatorPlayerId?: string | null } }).game?.creatorPlayerId ?? null;
	}

	let should_reload_on_reconnect = $state(false);
	let roomProtected = $state(false);
	let roomMaxPlayers = $state(20);
	let creatorPlayerId = $state<string | null>(null);
	let roomPassword = $state('');
	let roomPasswordError = $state<string | null>(null);
	let roomSizeError = $state<string | null>(null);
	let passwordPromptVisible = $state(false);
	let joinPending = $state(false);
	let roomPasswordSaving = $state(false);
	let roomSizeSaving = $state(false);
	let removingPlayerId = $state<string | null>(null);

	let settings = settingsStore;

	let connection: Status = $state(Status.CONNECTING);
	let error: string | null = $state(null);
	let player_id: string | null = $state(null);
	let errors: any[] = $state([]);
	let players: Player[] = $state([]);

	let prev_ping_ts = 0;
	let client_ping = $state(0);
	let ping_timeout: ReturnType<typeof setInterval> | null;
	let last_pong = 0;

	let my_name = LocalPlayer.name;

	let current_question: {
		content: string;
		catagory: string;
	} | null = $state(null);
	let pendingVote: VoteOptions | null = $state(null);
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

	function getShareData() {
		return {
			title: 'Never Have I Ever ~ games.kieran.dev',
			text: 'play Never Have I Ever with me!',
			url: `https://games.kieran.dev/play/${id}/never-have-i-ever`
		};
	}

	const voteLabels: Record<VoteOptions, string> = {
		[VoteOptions.Have]: 'Have',
		[VoteOptions.HaveNot]: 'Have Not',
		[VoteOptions.Kinda]: 'Kinda'
	};

	let connectedPlayers = $derived(players.filter((player) => player.connected));
	let connectedPlayerCount = $derived(connectedPlayers.length);
	let votedPlayerCount = $derived(connectedPlayers.filter((player) => player.this_round.voted).length);
	let allConnectedPlayersVoted = $derived(connectedPlayerCount > 0 && votedPlayerCount === connectedPlayerCount);
	let canAdvanceRound = $derived(!game_state.waiting_for_players || allConnectedPlayersVoted);
	let acknowledgedVote = $derived(players.find((player) => player.id === player_id)?.this_round.vote ?? null);
	let canManageRoomPassword = $derived(Boolean(creatorPlayerId && player_id === creatorPlayerId));
	let roomPrivacyLabel = $derived(roomProtected ? 'Protected' : 'Public');
	let visibleCatagories = $derived.by(() => {
		if (!catagories) return [] as [string, Catagories[string]][];

		return Object.entries(catagories).filter(([, catagory]) => {
			if (($settings.no_nsfw ?? false) && catagory.flags.is_nsfw) {
				return false;
			}

			if (!($settings.show_hidden ?? false) && catagory.flags.is_hidden) {
				return false;
			}

			return true;
		});
	});
	let visibleCategoryCount = $derived(visibleCatagories.length);
	let selectedCategoryCount = $derived(game_state.current_catagory.length);

	async function share_game() {
		const share_data = getShareData();

		if (navigator.share) {
			posthog.capture('game_shared', { method: 'native', game_type: 'never-have-i-ever' });
			await navigator.share(share_data);
		} else {
			await navigator.clipboard.writeText(share_data.url);
			toast.success('Copied game link to clipboard');
			posthog.capture('game_shared', { method: 'clipboard', game_type: 'never-have-i-ever' });
		}
	}

	function reload_page() {
		window.location.reload();
	}

	async function handleRemoved(message: string) {
		clearStoredRoomPassword(id);
		roomPassword = '';
		toast.error(message, { duration: 3500 });
		await goto('/games');
	}

	onMount(() => {
		if (LocalPlayer.name === null) return goto(`/play/name?redirect=/play/${id}/never-have-i-ever`);
		player_id = LocalPlayer.id;
		roomProtected = initialRoomProtected();
		roomMaxPlayers = initialMaxPlayers();
		creatorPlayerId = initialCreatorPlayerId();
		roomPassword = getStoredRoomPassword(id);
		passwordPromptVisible = roomProtected && !roomPassword;
		if (!passwordPromptVisible) {
			attemptJoin();
		}

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

	function setTransientError(message: string, duration = 2500) {
		error = message;
		setTimeout(() => {
			if (error === message) {
				error = null;
			}
		}, duration);
	}

	function sendSocketAction(payload: Record<string, unknown>): boolean {
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			setTransientError('Connection lost. Reconnecting...');
			return false;
		}

		socket.send(JSON.stringify(payload));
		return true;
	}

	function getJoinPayload() {
		return {
			op: 'join_game',
			create: true,
			playername: my_name,
			...(roomPassword ? { password: roomPassword } : {})
		};
	}

	function attemptJoin() {
		joinPending = true;
		roomPasswordError = null;

		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(getJoinPayload()));
			return;
		}

		setupsock();
	}

	function submitRoomPassword(password: string) {
		roomPassword = password;
		storeRoomPassword(id, password);
		passwordPromptVisible = false;
		attemptJoin();
	}

	function saveLobbyPassword(password: string) {
		roomPasswordSaving = true;
		roomPasswordError = null;
		roomPassword = password;
		storeRoomPassword(id, password);
		if (!sendSocketAction({ op: 'set_room_password', password })) {
			roomPasswordSaving = false;
		}
	}

	function clearLobbyPassword() {
		roomPasswordSaving = true;
		roomPasswordError = null;
		roomPassword = '';
		clearStoredRoomPassword(id);
		if (!sendSocketAction({ op: 'set_room_password', password: '' })) {
			roomPasswordSaving = false;
		}
	}

	function saveLobbyMaxPlayers(maxPlayers: number) {
		roomSizeSaving = true;
		roomSizeError = null;
		roomMaxPlayers = maxPlayers;
		if (!sendSocketAction({ op: 'set_max_players', maxPlayers })) {
			roomSizeSaving = false;
		}
	}

	function removeLobbyPlayer(targetPlayerId: string) {
		removingPlayerId = targetPlayerId;
		if (!sendSocketAction({ op: 'remove_player', playerId: targetPlayerId })) {
			removingPlayerId = null;
		}
	}

	function syncGameState(nextGame: NHIEGameState) {
		const previousQuestion = current_question?.content;
		const nextQuestion = nextGame.current_question?.content;

		if (!game_state.game_completed && nextGame.gameCompleted) {
			posthog.capture('nhie_game_completed', {
				player_count: (nextGame.players ?? []).length,
				history_count: (nextGame.history ?? []).length
			});
		}

		game_state = {
			catagory_select: nextGame.phase === 'category_select',
			game_completed: nextGame.gameCompleted,
			waiting_for_players: nextGame.waitingForPlayers || false,
			current_catagory: nextGame.catagories,
			history: nextGame.history
		};

		current_question = nextGame.current_question;
		players = nextGame.players;
		roomMaxPlayers = nextGame.maxPlayers ?? 20;
		creatorPlayerId = nextGame.creatorPlayerId ?? null;
		roomProtected = Boolean(nextGame.passwordProtected);
		roomPasswordSaving = false;
		roomSizeSaving = false;
		removingPlayerId = null;
		if (!roomProtected) {
			clearStoredRoomPassword(id);
		}

		if (game_state.catagory_select || previousQuestion !== nextQuestion) {
			pendingVote = null;
		}
	}

	function isVoteActive(option: VoteOptions) {
		if (acknowledgedVote) {
			return acknowledgedVote === voteLabels[option];
		}

		return pendingVote === option;
	}

	function toggleSelection(catagory: string) {
		const isSelected = game_state.current_catagory.includes(catagory);
		const current_catagory = isSelected
			? game_state.current_catagory.filter((selected) => selected !== catagory)
			: [...game_state.current_catagory, catagory];

		game_state = {
			...game_state,
			current_catagory
		};
	}

	function confirmSelections() {
		if (game_state.current_catagory.length > 0) {
			posthog.capture('nhie_categories_confirmed', {
				category_count: game_state.current_catagory.length,
				categories: game_state.current_catagory
			});
			sendSocketAction({ op: 'confirm_selections' });
		} else {
			setTransientError('You must select at least one catagory');
		}
	}

	function selectCatagories() {
		sendSocketAction({ op: 'select_categories' });
	}

	function selectQuestion() {
		if (!canAdvanceRound) {
			return;
		}

		posthog.capture('nhie_next_question');
		sendSocketAction({ op: 'next_question' });
	}

	function reset() {
		posthog.capture('game_reset', { game_type: 'never-have-i-ever' });
		if (!sendSocketAction({ op: 'reset_game' })) {
			return;
		}
		conf_reset_display = false;

		if (timeout_interval) {
			clearInterval(timeout_interval);
			timeout_interval = null;
		}
		round_timeout = 0;
		timeout_start = 0;
		timeout_duration = 0;
	}

	function emitSelectCatagory(catagory: string) {
		toggleSelection(catagory);

		if (!sendSocketAction({ op: 'select_category', catagory })) {
			toggleSelection(catagory);
		}
	}

	function vote(option: VoteOptions) {
		if (!current_question?.content) {
			return;
		}

		posthog.capture('nhie_vote_cast', {
			vote: option,
			category: current_question?.catagory
		});
		pendingVote = option;
		if (!sendSocketAction({ op: 'vote', option })) {
			pendingVote = null;
			return;
		}
		if (browser && 'vibrate' in navigator) {
			try {
				(navigator as any).vibrate?.(10);
			} catch {}
		}
	}

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

	if (browser) {
		(window as any).debugGameState = debugGameState;
	}

	let socket: WebSocket | null = null;
	let retry_count = 0;
	let reconnect_timeout: ReturnType<typeof setTimeout> | null = null;
	let connection_timeout: ReturnType<typeof setTimeout> | null = null;
	let reconnect_scheduled = false;
	let reconnect_inflight = false;
	function setupsock() {
		// Prevent attaching duplicate listeners to an existing socket
		if (socket !== null) return;
		const nextPlayerId = player_id ?? LocalPlayer.id;
		if (!nextPlayerId) {
			console.log('[DEBUG] Cannot create socket without a player id');
			return;
		}
		const params: Record<string, string> = {
			playing: 'never-have-i-ever',
			game: id,
			player: nextPlayerId
		};
		if (userId) params.user = userId;
		const socketUrl = buildSocketUrl(env.PUBLIC_SOCKET_URL, params);
		try {
			socket = new WebSocket(socketUrl);
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
					case 'game_state':
						console.log('[DEBUG] Game state received:', {
							waiting_for_players: data.game.waitingForPlayers,
							timeout_start: data.game.timeout_start,
							timeout_duration: data.game.timeout_duration,
							current_timeout_start: timeout_start,
							current_timeout_duration: timeout_duration,
							players: data.game.players
						});

						syncGameState(data.game as NHIEGameState);
						joinPending = false;
						passwordPromptVisible = false;
						roomPasswordError = null;

						if (
							game_state.waiting_for_players &&
							data.game.timeout_start !== undefined &&
							data.game.timeout_start > 0 &&
							data.game.timeout_duration
						) {
							console.log('[DEBUG] Setting timeout:', data.game.timeout_start, data.game.timeout_duration);
							timeout_start = data.game.timeout_start;
							timeout_duration = data.game.timeout_duration;

							if (!timeout_interval) {
								console.log('[DEBUG] Starting countdown interval');
								timeout_interval = setInterval(() => {
									const elapsed = Date.now() - timeout_start;
									const remaining = Math.max(0, Math.ceil((timeout_duration - elapsed) / 1000));
									round_timeout = remaining;

									if (remaining <= 0) {
										if (timeout_interval) {
											clearInterval(timeout_interval);
											timeout_interval = null;
										}
									}
								}, 100);
							}
						} else if (!game_state.waiting_for_players && timeout_interval) {
							clearInterval(timeout_interval);
							timeout_interval = null;
							round_timeout = 0;
							timeout_start = 0;
							timeout_duration = 0;
						}
						break;
					case 'new_round':
						current_round.votes = [];
						pendingVote = null;
						if (browser) {
							window.navigator.vibrate([100, 50, 100]);
						}
						break;
					case 'vote_cast':
						current_round.votes = [...current_round.votes, { player: data.player, voted: data.vote }];
						if (data.player) {
							const existingIndex = players.findIndex((player) => player.id === data.player.id);
							if (existingIndex === -1) {
								players = [...players, data.player];
							} else {
								players = players.map((player) => (player.id === data.player.id ? data.player : player));
							}
						}
						break;
					case 'error': {
						const message = data?.error?.message || data?.message || 'Server error';
						const operation = data?.error?.operation;
						errors = [...errors, data];
						pendingVote = null;

						if (
							message === 'This game requires a password' ||
							message === 'Incorrect game password'
						) {
							roomPasswordError = message;
							passwordPromptVisible = true;
							joinPending = false;
							clearStoredRoomPassword(id);
							roomPassword = '';
						} else {
							if (operation === 'set_room_password') {
								roomPasswordError = message;
								roomPasswordSaving = false;
							}
							if (operation === 'set_max_players') {
								roomSizeError = message;
								roomSizeSaving = false;
							}
							if (operation === 'remove_player') {
								removingPlayerId = null;
							}
							setTransientError(message);
						}
						break;
					}
					case 'removed_from_game':
						removingPlayerId = null;
						joinPending = false;
						void handleRemoved(data.message ?? 'You were removed from the game');
						break;
					case 'github_push':
						setTimeout(() => {
							if (data.showReloadButton) {
								toast.info(data.notification, {
									action: { label: 'Reload', onClick: reload_page },
									duration: 6000
								});
							} else {
								toast.info(data.notification);
							}
						}, data.delay);
						should_reload_on_reconnect = true;
						break;
					case 'round_timeout':
						console.log('[DEBUG] Round timeout received:', data.message);
						toast.info(data.message, { duration: 3000 });

						if (timeout_interval) {
							clearInterval(timeout_interval);
							timeout_interval = null;
						}
						round_timeout = 0;
						timeout_start = 0;
						timeout_duration = 0;
						break;
					case 'pong': {
						const multi_diff = performance.now() - prev_ping_ts;

						if (client_ping !== 0) {
							client_ping = client_ping * 0.8 + multi_diff * 0.2;
						} else {
							client_ping = multi_diff;
						}
						last_pong = performance.now();
						break;
					}
					default:
						console.log('unhandled');
				}
			} catch (e) {
				console.log(e);
			}
		});

		// socket opened
		socket?.addEventListener('open', (event) => {
			connection = Status.CONNECTED;
			measure_ping();
			socket?.send(JSON.stringify(getJoinPayload()));
			posthog.capture('game_joined', { game_type: 'never-have-i-ever', game_id: id });
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
	class="text-zinc-100 text-center min-h-screen px-3 pb-[calc(env(safe-area-inset-bottom)+8.5rem)]"
>
	{#if passwordPromptVisible}
		<RoomPasswordGate
			initialValue={roomPassword}
			error={roomPasswordError}
			busy={joinPending}
			onSubmit={submitRoomPassword}
		/>
	{:else if !game_state.game_completed}
		{#if game_state.catagory_select}
			<div class="mx-auto mt-4 w-full max-w-6xl" in:fade={{ duration: 260, easing: quintOut }}>
				<div class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
					<section class="rounded-2xl border border-white/8 bg-zinc-950 p-4 text-left sm:p-5" in:fly={{ y: 10, duration: 260, easing: backOut }}>
						<div class="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h1 class="text-xl font-black text-white sm:text-2xl">New game</h1>
								<p class="mt-1 text-sm text-white/45">
									{selectedCategoryCount > 0
										? `${selectedCategoryCount} selected from ${visibleCategoryCount}`
										: 'Choose at least one category to continue'}
								</p>
							</div>
							<button
								type="button"
								class="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
								onclick={() => confirmSelections()}
								disabled={selectedCategoryCount === 0}
							>
								Continue
							</button>
						</div>

						{#if catagories !== undefined}
							<div class="mt-4 overflow-hidden rounded-xl border border-white/8 bg-zinc-900/50">
								{#each visibleCatagories as [catagory_name, catagory], index (catagory_name)}
									{@const isSelected = game_state.current_catagory.includes(catagory_name)}
									<label
										class={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition ${index > 0 ? 'border-t border-white/6' : ''} ${isSelected ? 'bg-white/[0.06] text-white' : 'text-white/70 hover:bg-white/[0.04] hover:text-white'}`}
										in:fly={{
											y: 5,
											duration: 180,
											delay: Math.min(index * 10, 120),
											easing: quintOut
										}}
									>
										<div class="min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-2">
												<span class="text-sm font-semibold capitalize">{catagory_name}</span>
												{#if catagory.flags.is_nsfw}
													<span class="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-red-200">NSFW</span>
												{/if}
												{#if catagory.flags.is_hidden}
													<span class="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Hidden</span>
												{/if}
											</div>
										</div>
										<input
											type="checkbox"
											class="h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-emerald-500"
											checked={isSelected}
											onchange={() => emitSelectCatagory(catagory_name)}
										/>
									</label>
								{/each}
							</div>
						{:else}
							<div class="mt-4 space-y-2">
								{#each Array.from({ length: 6 }) as _, index (index)}
									<div class="h-11 animate-pulse rounded-xl border border-white/8 bg-zinc-900/50"></div>
								{/each}
							</div>
						{/if}
					</section>

					<aside class="space-y-4">
						<div class="rounded-2xl border border-white/8 bg-zinc-950 px-4 py-3 text-left">
							<div class="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
								<div class="rounded-full border border-white/10 px-3 py-1">{connectedPlayerCount}/{roomMaxPlayers} seats</div>
								<div class="rounded-full border border-white/10 px-3 py-1">{roomPrivacyLabel}</div>
							</div>
						</div>

						<PreGameConnection
							{connection}
							{players}
							{creatorPlayerId}
							currentPlayerId={player_id}
							canManagePlayers={canManageRoomPassword}
							{removingPlayerId}
							onRemovePlayer={removeLobbyPlayer}
						/>

						{#if canManageRoomPassword}
							<div class="grid gap-4">
								<RoomCapacitySettings
									maxPlayers={roomMaxPlayers}
									currentPlayers={players.length}
									minPlayers={2}
									error={roomSizeError}
									busy={roomSizeSaving}
									onSave={saveLobbyMaxPlayers}
								/>
								<RoomPasswordSettings
									passwordProtected={roomProtected}
									error={roomPasswordError}
									busy={roomPasswordSaving}
									onSave={saveLobbyPassword}
									onClear={clearLobbyPassword}
								/>
							</div>
						{/if}
					</aside>
				</div>
			</div>
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
					{#each connectedPlayers as player, index (player.id)}
						<div
							class={`relative my-1 p-1 font-bold text ${colour_map[player.this_round.vote ?? 'null']} transition-colors duration-300 ease-out`}
							in:fly={{ y: 6, duration: 220, delay: Math.min(index * 25, 300), easing: quintOut }}
							animate:flip
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
							{votedPlayerCount} / {connectedPlayerCount} players voted
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
			<div
				class="fixed bottom-0 left-0 w-full z-30"
				in:fly={{ y: 32, duration: 320, easing: quintOut }}
			>
				<div
					class="w-full grid grid-cols-9 bg-zinc-900/90 backdrop-blur-sm border-t border-zinc-700/60"
				>
					<button
						class={`col-span-3 text-white text-2xl md:text-3xl font-semibold py-3 transition-all duration-200 ease-out hover:text-emerald-300 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring focus-visible:ring-emerald-400/40 hover:shadow-[0_8px_24px_-12px_rgba(16,185,129,0.6)] ${isVoteActive(VoteOptions.Have) ? 'bg-emerald-700/70' : ''}`}
						onclick={() => vote(VoteOptions.Have)}
						aria-pressed={isVoteActive(VoteOptions.Have)}
						data-testid="have-button"
					>
						Have
					</button>
					<button
						class={`col-span-3 text-white text-2xl md:text-3xl font-semibold py-3 border-x border-slate-700/60 transition-all duration-200 ease-out hover:text-sky-300 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring focus-visible:ring-sky-400/40 hover:shadow-[0_8px_24px_-12px_rgba(56,189,248,0.6)] ${isVoteActive(VoteOptions.Kinda) ? 'bg-sky-700/70' : ''}`}
						onclick={() => vote(VoteOptions.Kinda)}
						aria-pressed={isVoteActive(VoteOptions.Kinda)}
					>
						Kinda
					</button>
					<button
						class={`col-span-3 text-white text-2xl md:text-3xl font-semibold py-3 transition-all duration-200 ease-out hover:text-rose-300 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring focus-visible:ring-rose-400/40 hover:shadow-[0_8px_24px_-12px_rgba(244,63,94,0.6)] ${isVoteActive(VoteOptions.HaveNot) ? 'bg-rose-700/70' : ''}`}
						onclick={() => vote(VoteOptions.HaveNot)}
						aria-pressed={isVoteActive(VoteOptions.HaveNot)}
						data-testid="have-not-button"
					>
						Have not
					</button>
				</div>
				<div
					class="w-full grid grid-cols-9 bg-zinc-900/90 backdrop-blur-sm pb-[max(env(safe-area-inset-bottom),0.5rem)]"
				>
					<button
						class="col-span-2 text-white bg-zinc-700 hover:bg-rose-600 text-xl md:text-2xl py-3"
						onclick={() => conf_reset()}
					>
						<MdiUndoVariant class="w-7 h-7 mx-auto" />
					</button>
					<button
						class="col-span-5 text-white bg-emerald-600 hover:bg-emerald-500 text-3xl md:text-5xl py-4"
						onclick={() => selectQuestion()}
						disabled={!canAdvanceRound}
					>
						{#if game_state.waiting_for_players}
							{#if allConnectedPlayersVoted}
								Skip Round
							{:else}
								Waiting for Votes
							{/if}
						{:else}
							Next Question
						{/if}
					</button>
					<button
						class="col-span-2 text-white bg-zinc-700 hover:bg-zinc-600 text-xl md:text-2xl py-3"
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
					class={`fixed bottom-4 right-4 z-50 py-2 px-4 rounded-md bg-zinc-800 border-t-2 border-zinc-700 shadow pointer-events-none text-zinc-300 ${
						categories_click ? 'opacity-40' : 'opacity-0'
					} overflow-hidden transition-all duration-200`}
				>
					<p>Double Click</p>
				</div>
			{/if}
			<Tutorial
				id="ingame"
				steps={[
					{
						title: 'Vote quickly',
						content:
							'When a question appears, tap your answer. The next round can start once everyone has voted.'
					},
					{
						title: 'Anyone can drive',
						content:
							'Any player can skip to the next question, reset, or reopen category selection.'
					},
					{ title: 'Have fun', content: 'Keep it light. The scoreboard is for laughs.' }
				]}
			/>
			<ConnectionInfoPanel {connection} {players} {errors} ping={client_ping} />
		{/if}
	{:else}
		<h1 class="text-2xl font-semibold text-zinc-100">There are no more questions</h1>
		{#each players as player (player.id)}
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
</div>
<div class="fixed z-20 top-16 left-2">
	<button class="relative rounded-full p-2 panel duration-200" title="Share!" onclick={share_game}>
		<MdiShareOutline class="text-zinc-100 h-8 w-8" />
	</button>
</div>
