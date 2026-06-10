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
	import { fetchCatagories, parseNHIEGameState } from '$lib/api';
	import { clearStoredRoomPassword, getStoredRoomPassword, storeRoomPassword } from '$lib/room-password';
	import RoomPasswordGate from '../shared/RoomPasswordGate.svelte';
	import { toast } from '$lib/toast';
	import Tutorial from '../Tutorial.svelte';
	import { settingsStore } from '$lib/settings';
	import NhieGameShell, { type NhieStep } from './NhieGameShell.svelte';
	import NhieLobbyPhase from './phases/NhieLobbyPhase.svelte';
	import NhieCategoryPhase from './phases/NhieCategoryPhase.svelte';
	import NhiePlayPhase from './phases/NhiePlayPhase.svelte';
	import NhieGameOverPhase from './phases/NhieGameOverPhase.svelte';
	import type { NhieRoundPhase } from './types';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
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
	let setupStep = $state<'lobby' | 'categories'>('lobby');

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
	let votedPlayerCount = $derived(
		connectedPlayers.filter(
			(player) =>
				player.this_round.voted || (player.id === player_id && pendingVote !== null)
		).length
	);
	let allConnectedPlayersVoted = $derived(connectedPlayerCount > 0 && votedPlayerCount === connectedPlayerCount);
	let canAdvanceRound = $derived(!game_state.waiting_for_players || allConnectedPlayersVoted);
	let acknowledgedVote = $derived(players.find((player) => player.id === player_id)?.this_round.vote ?? null);
	let hasMyVote = $derived(pendingVote !== null || acknowledgedVote !== null);
	let roundPhase = $derived.by((): NhieRoundPhase => {
		if (!game_state.waiting_for_players) return 'answer';
		if (allConnectedPlayersVoted) return 'results';
		return 'waiting';
	});
	let revealVotes = $derived(roundPhase === 'results');
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

	let nhieStep = $derived.by((): NhieStep => {
		if (game_state.game_completed) return 'results';
		if (!game_state.catagory_select) return 'play';
		return setupStep === 'categories' ? 'categories' : 'lobby';
	});

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
			void fetchCatagories()
				.then((data) => {
					if (data) {
						catagories = data;
					} else {
						error = 'Failed to fetch catagories';
					}
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

	function syncRoundTimer(waiting: boolean, nextStart: number, nextDuration: number) {
		if (timeout_interval) {
			clearInterval(timeout_interval);
			timeout_interval = null;
		}

		if (!waiting || nextStart <= 0 || nextDuration <= 0) {
			round_timeout = 0;
			timeout_start = 0;
			timeout_duration = 0;
			return;
		}

		timeout_start = nextStart;
		timeout_duration = nextDuration;

		const tick = () => {
			const elapsed = Date.now() - timeout_start;
			const remaining = Math.max(0, Math.ceil((timeout_duration - elapsed) / 1000));
			round_timeout = remaining;

			if (remaining <= 0 && timeout_interval) {
				clearInterval(timeout_interval);
				timeout_interval = null;
			}
		};

		tick();
		timeout_interval = setInterval(tick, 100);
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

		if (nextGame.phase === 'category_select' && previousQuestion !== undefined) {
			setupStep = 'categories';
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
			sendSocketAction({
				op: 'confirm_selections',
				categories: game_state.current_catagory
			});
		} else {
			setTransientError('You must select at least one catagory');
		}
	}

	function selectCatagories() {
		if (!sendSocketAction({ op: 'select_categories' })) {
			return;
		}
		setupStep = 'categories';
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
		setupStep = 'lobby';

		syncRoundTimer(false, 0, 0);
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

						syncGameState(parseNHIEGameState(data.game));
						joinPending = false;
						passwordPromptVisible = false;
						roomPasswordError = null;

						syncRoundTimer(
							game_state.waiting_for_players,
							Number(data.game.timeout_start ?? 0),
							Number(data.game.timeout_duration ?? 0)
						);
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
						// Legacy op — timer sync is handled via game_state after advance.
						syncRoundTimer(false, 0, 0);
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

{#if passwordPromptVisible}
	<RoomPasswordGate
		initialValue={roomPassword}
		error={roomPasswordError}
		busy={joinPending}
		onSubmit={submitRoomPassword}
	/>
{:else}
	<NhieGameShell
		currentStep={nhieStep}
		{connection}
		{players}
		{errors}
		ping={client_ping}
		onShare={share_game}
		showPlayMenu={nhieStep === 'play'}
		onReset={() => (conf_reset_display ? reset() : conf_reset())}
		onOpenCategories={selectCatagories}
		confirmResetVisible={conf_reset_display}
	>
		{#snippet headerInfo()}
			{#if nhieStep === 'lobby'}
				<span class="text-muted-foreground text-sm">
					<span class="text-foreground font-medium">{connectedPlayerCount}</span>
					{connectedPlayerCount === 1 ? 'player' : 'players'} in room
				</span>
			{:else if nhieStep === 'categories'}
				<span class="text-muted-foreground text-sm">
					<span class="text-foreground font-medium">{selectedCategoryCount}</span>
					{selectedCategoryCount === 1 ? 'deck' : 'decks'} selected
				</span>
			{:else if nhieStep === 'play'}
				<span class="text-muted-foreground flex min-w-0 items-center gap-2 text-sm">
					<span class="text-foreground font-medium tabular-nums">
						Round {game_state.history.length + 1}
					</span>
					{#if current_question?.catagory}
						<span class="bg-border h-3.5 w-px shrink-0"></span>
						<span class="min-w-0 truncate">{current_question.catagory}</span>
					{/if}
					{#if game_state.current_catagory.length > 0}
						<span class="bg-border h-3.5 w-px shrink-0 hidden sm:block"></span>
						<span class="text-muted-foreground/70 hidden truncate text-xs sm:block">
							{game_state.current_catagory.length} {game_state.current_catagory.length === 1 ? 'pack' : 'packs'}
						</span>
					{/if}
				</span>
			{:else if nhieStep === 'results'}
				<span class="text-muted-foreground text-sm">
					<span class="text-foreground font-medium">{game_state.history.length}</span>
					{game_state.history.length === 1 ? 'round' : 'rounds'} played
					{#if game_state.current_catagory.length > 0}
						<span class="hidden sm:inline">
							· {game_state.current_catagory.join(', ')}
						</span>
					{/if}
				</span>
			{/if}
		{/snippet}
		{#if game_state.catagory_select}
			{#if setupStep === 'lobby'}
				<NhieLobbyPhase
					{players}
					{connectedPlayerCount}
					{roomMaxPlayers}
					{roomPrivacyLabel}
					{creatorPlayerId}
					currentPlayerId={player_id}
					canManageRoomPassword={canManageRoomPassword}
					{removingPlayerId}
					roomSizeError={roomSizeError}
					roomSizeSaving={roomSizeSaving}
					roomPasswordError={roomPasswordError}
					roomPasswordSaving={roomPasswordSaving}
					roomProtected={roomProtected}
					onRemovePlayer={removeLobbyPlayer}
					onSaveRoomSize={saveLobbyMaxPlayers}
					onSaveRoomPassword={saveLobbyPassword}
					onClearRoomPassword={clearLobbyPassword}
					onContinueToCategories={() => (setupStep = 'categories')}
				/>
			{:else}
				<NhieCategoryPhase
					{visibleCatagories}
					selectedCategories={game_state.current_catagory}
					{visibleCategoryCount}
					{selectedCategoryCount}
					catagoriesLoaded={catagories !== undefined}
					onToggleCategory={emitSelectCatagory}
					onConfirm={confirmSelections}
					onBackToLobby={() => (setupStep = 'lobby')}
				/>
			{/if}
		{:else if game_state.game_completed}
			<NhieGameOverPhase
				{players}
				history={game_state.history}
				onReset={reset}
			/>
		{:else}
			<NhiePlayPhase
				currentQuestion={current_question}
				{connectedPlayers}
				waitingForPlayers={game_state.waiting_for_players}
				{votedPlayerCount}
				{connectedPlayerCount}
				roundTimeout={round_timeout}
				timeoutStart={timeout_start}
				{canAdvanceRound}
				{allConnectedPlayersVoted}
				{roundPhase}
				{hasMyVote}
				{revealVotes}
				{error}
				{isVoteActive}
				onVote={vote}
				onAdvance={selectQuestion}
				roundNumber={game_state.history.length + 1}
				myVote={acknowledgedVote ?? (pendingVote !== null ? voteLabels[pendingVote] : null)}
				currentPlayerId={player_id}
			/>

			{#if $settings?.show_debug}
				<Card class="mt-4">
					<CardContent class="space-y-2 p-3 text-left text-xs">
						<div>Timer: {round_timeout}s | Start: {timeout_start} | Duration: {timeout_duration}</div>
						<div>
							Waiting: {game_state.waiting_for_players} | Interval: {timeout_interval
								? 'active'
								: 'inactive'}
						</div>
						<Button size="sm" onclick={debugGameState}>Debug State</Button>
					</CardContent>
				</Card>
			{/if}

			{#if !$settings.no_tutorials}
				<Tutorial
					id="ingame"
					steps={[
						{
							title: 'Vote quickly',
							content:
								'When a question appears, tap Have, Kinda, or Have not. The bar shows how many players have voted.'
						},
						{
							title: 'Advance the round',
							content:
								'When everyone has voted, results appear for a few seconds — tap Next question or wait for the timer.'
						},
						{ title: 'Have fun', content: 'Keep it light. The scoreboard is for laughs.' }
					]}
				/>
			{/if}
		{/if}
	</NhieGameShell>
{/if}
