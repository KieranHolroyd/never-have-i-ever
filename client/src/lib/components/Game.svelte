<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { LocalPlayer } from '$lib/player';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { Status, VoteOptions, type Player, type Catagories } from '$lib/types';
	import ConnectionInfoPanel from './ConnectionInfoPanel.svelte';
	import PreGameConnection from './PreGameConnection.svelte';
	import Notification from './Notification.svelte';
	import Tutorial from './Tutorial.svelte';
	import { colour_map } from '$lib/colour';
	import History from './History.svelte';
	import { settingsStore } from '$lib/settings';

	import MdiUndoVariant from '~icons/mdi/undo-variant';
	import MdiListBox from '~icons/mdi/list-box';

	export let id: string;
	export let catagories: Catagories | undefined;

	let error: string | null = null;
	let show_notification = false;
	let notification_content = '';

	let settings = settingsStore;

	let connection: Status = Status.CONNECTING;
	let player_id: string | null = null;
	let errors: any[] = [];
	let players: Player[] = [];

	// ping stuff
	let prev_ping_ts = 0; //ms (epoch)
	let client_ping = 0; //ms
	let ping_timeout: ReturnType<typeof setInterval> | null;
	let last_pong = 0; //ms

	let my_name = LocalPlayer.name;

	let current_question: {
		content: string;
		catagory: string;
	} | null = null;
	let conf_reset_display = false;
	let categories_click = false;

	let game_state: {
		catagory_select: boolean;
		game_completed: boolean;
		current_catagory: string[];
		history: any[];
	} = {
		catagory_select: true,
		game_completed: false,
		current_catagory: [],
		history: []
	};
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

	onMount(() => {
		if (LocalPlayer.name === null) return goto(`/play/name?redirect=/play/${id}`);
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
		};
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
		if (players?.filter((p) => p.this_round.voted).length > 0) {
			socket?.send(JSON.stringify({ op: 'next_question' }));
		} else {
			error = 'You must vote before moving on';
			setTimeout(() => {
				error = null;
			}, 2500);
		}
	}
	function reset() {
		socket?.send(JSON.stringify({ op: 'reset_game' }));
		conf_reset_display = false;
	}

	function emitSelectCatagory(catagory: string) {
		socket?.send(JSON.stringify({ op: 'select_catagory', catagory }));
	}

	function vote(option: VoteOptions) {
		socket?.send(JSON.stringify({ op: 'vote', option }));
	}

	/// WEBSOCKET STUFF
	let socket: WebSocket | null = null;
	let retry_count = 0;
	function setupsock() {
		const sock_url = env.PUBLIC_SOCKET_URL ?? 'ws://localhost:3000/';
		const sock_params = `?game=${id}&player=${player_id}`;
		if (socket === null) socket = new WebSocket(sock_url + sock_params);

		// message is received
		socket?.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data);
				switch (data.op) {
					case 'open':
						connection = Status.CONNECTED;
						measure_ping(true);
						break;
					case 'select_catagory':
						toggleSelection(data.catagory);
						break;
					case 'game_state':
						game_state.current_catagory = data.game.catagories;
						game_state.catagory_select = data.game.catagory_select;
						game_state.game_completed = data.game.game_completed;
						game_state.history = data.game.history;

						current_question = data.game.current_question;
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
							show_notification = true;
							notification_content = data.notification;
						}, data.delay);
						break;
					case 'pong':
						const multi_diff = performance.now() - prev_ping_ts;

						client_ping = client_ping * 0.8 + multi_diff * 0.2; // 5 frame average
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
		});

		// socket closed
		socket?.addEventListener('close', (event) => {
			connection = Status.DISCONNECTED;
			if (ping_timeout) {
				clearInterval(ping_timeout);
				ping_timeout = null;
			}
			if (event.code === 4000) return;
			setTimeout(reconnect, 200 * Math.max(1, retry_count));
		});

		// error handler
		socket?.addEventListener('error', (event) => {
			connection = Status.DISCONNECTED;
			if (ping_timeout) {
				clearInterval(ping_timeout);
				ping_timeout = null;
			}
		});
		function reconnect() {
			retry_count = retry_count + 1;
			console.log(retry_count, 100 * Math.max(1, retry_count));
			socket?.close();
			socket = null;
			socket = new WebSocket(sock_url + sock_params);
			setupsock();
		}
	}

	function measure_ping(first = false) {
		const time_since_last_pong = performance.now() - last_pong;
		if (time_since_last_pong > 3_000) {
			connection = Status.CONNECTING;
		} else {
			if (connection !== Status.CONNECTED) {
				connection = Status.CONNECTED;
			}
		}
		// Kill connections after 10 sec inactivity
		if (time_since_last_pong > 10_000) {
			socket?.close();
			socket = null;
			setupsock();
		}

		prev_ping_ts = performance.now();
		for (let i = 0; i < (first ? 5 : 1); i++) {
			socket?.send(JSON.stringify({ op: 'ping' }));
		}
		if (!ping_timeout) {
			ping_timeout = setInterval(measure_ping, 1000);
		}
	}
	/// ----------------
</script>

<div class="dark:text-white text-black text-center">
	{#if !game_state.game_completed}
		{#if game_state.catagory_select}
			<div class="mx-auto mt-4 prose dark:prose-invert lg:prose-lg xl:prose-xl">
				<h1>New Game</h1>
			</div>
			<div
				class="z-10 w-64 mx-auto mt-6 columns-1 dark:text-white dark:bg-gray-800 bg-white border-2 dark:border-gray-600 border-gray-200 shadow rounded-t-md"
			>
				<p class="text-xl font-semibold py-2 dark:bg-black bg-gray-200 rounded-t-md">
					Select Catagories
				</p>
				{#if catagories !== undefined}
					{#each Object.entries(catagories) as [catagory_name, catagory]}
						{#if catagory.flags.is_nsfw && $settings?.no_nsfw}
							<span />
						{:else}
							<label class="my-[2px]">
								<div
									class="py-1 px-4 w-full text-left text-lg capitalize font-semibold hover:bg-gray-100 hover:dark:bg-gray-600 duration-75"
								>
									<input
										type="checkbox"
										class=""
										bind:group={game_state.current_catagory}
										on:change={() => emitSelectCatagory(catagory_name)}
										value={catagory_name}
										checked={game_state.current_catagory.includes(catagory_name)}
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
				{:else}
					<p>Loading...</p>
				{/if}
			</div>
			<button
				class="rounded-none transition bg-green-500 text-white font-bold py-2 px-4 hover:bg-green-400 w-64 rounded-b-md shadow hover:shadow-lg"
				on:click={() => confirmSelections()}
			>
				Continue
			</button>
			<PreGameConnection {connection} {players} />
			<Tutorial id="welcome" title="Welcome">
				<p>
					Welcome to the game! This is where the fun begins. You will be presented with a question,
					and you will have to vote on whether you have done it or not. You can also vote "Kinda" if
					you aren't sure.
				</p>
				<p>
					<b>First though</b>, you'll need to select the catagories you want to play with. You can
					select as many as you'd like.
				</p>
			</Tutorial>
			<!-- Local Error Popup -->
			<Notification
				show={error !== null}
				on:closeNotification={() => {
					error = null;
				}}
			>
				{error ?? 'Unknown Error (See Javascript Console)'}
			</Notification>
		{:else}
			{#if current_question?.content !== undefined}
				<div class="mx-auto my-6 max-w-lg p-3">
					<p class="m-0 text-xs uppercase font-bold">Catagory: {current_question?.catagory}</p>
					<p class="relative text-lg my-1 p-1">{current_question?.content}</p>
				</div>
				{#if error}
					<p class="text-red-700">{error}</p>
				{/if}
				<div class="mx-auto my-6 max-w-lg p-3">
					<p class="m-0 text-xs uppercase font-bold">Players</p>
					{#each players.filter((p) => p.connected) as player}
						<div class={`relative my-1 p-1 font-bold text ${colour_map[player.this_round.vote]}`}>
							{player.name}: {player.this_round.vote ?? 'Not Voted'}
							<div
								class="absolute text-xs leading-[1.825] top-1 right-1 bg-red-600 border border-white rounded-full text-white min-w-[1.5rem] h-6 px-1"
							>
								{player.score}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<h2>Choose a question</h2>
			{/if}
			<div class="action-bar">
				<div class="row dark:bg-gray-700 bg-white pb-2">
					<button
						class="text-xl md:text-2xl font-light px-4 dark:bg-gray-700 dark:text-white bg-white hover:bg-green-400 hover:dark:bg-opacity-50 col-span-3"
						on:click={() => vote(VoteOptions.Have)}
					>
						Have
					</button>
					<button
						class="border-x dark:border-gray-500 border-gray-200 text-xl md:text-2xl font-light px-4 dark:bg-gray-700 dark:text-white bg-white hover:bg-blue-400 hover:dark:bg-opacity-50 col-span-3"
						on:click={() => vote(VoteOptions.Kinda)}
					>
						Kinda
					</button>
					<button
						class="text-xl md:text-2xl font-light px-4 dark:bg-gray-700 dark:text-white bg-white hover:bg-red-400 hover:dark:bg-opacity-50 col-span-3"
						on:click={() => vote(VoteOptions.HaveNot)}
					>
						Have not
					</button>
				</div>
				<div class="row">
					<button
						class="text-white bg-gray-600 hover:bg-red-400 col-span-2"
						on:click={() => conf_reset()}
					>
						<MdiUndoVariant class="w-6 h-6 mx-auto" />
					</button>
					<button
						class="text-white bg-green-500 hover:bg-green-400 text-2xl md:text-4xl py-4 col-span-5"
						on:click={() => selectQuestion()}
					>
						Next Question
					</button>
					<button
						class="text-white bg-gray-600 hover:bg-gray-400 col-span-2"
						on:dblclick={() => selectCatagories()}
						on:click={() => {
							categories_click = true;
							setTimeout(() => (categories_click = false), 1000);
						}}
					>
						<MdiListBox class="w-6 h-6 mx-auto" />
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
			<Tutorial id="ingame" title="How to play">
				<p>
					This is an <b>online & multiplayer</b> version of the classic party game
					<i><b>Never Have I Ever</b></i>. Your votes will be tallied up and you will be given
					points based on your answers. The points are as follows:
				</p>
				<ul>
					<li>Have: <span class="text-green-400">+1 Point</span></li>
					<li>Kinda: <span class="text-green-400">+1/2 Point</span></li>
					<li>Have Not: <span class="text-blue-400">No Point</span></li>
				</ul>
				<p>
					<b>Remember!</b> This is a multiplayer experience, so selecting the next question,
					resetting the game, & showing the catagory selector again can be initiated by anyone.
					<i>so don't add the annoying group member</i>
				</p>
				<p>
					<b>One last thing!</b> The goal of the game is to have fun, so don't take it too seriously.
				</p>
			</Tutorial>
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
		<button on:click={() => reset()}>Reset Game</button>
	{/if}
	{#if conf_reset_display}
		<hr />
		<button class="red-button" on:click={() => reset()}>Confirm Reset</button>
	{/if}
	<!-- Global Notifications Panel -->
	<Notification
		show={show_notification}
		on:closeNotification={() => {
			show_notification = false;
			notification_content = '';
		}}
	>
		{notification_content}
	</Notification>
	{#if connection === Status.CONNECTED}
		<div
			class="fixed text-xs w-[3.25rem] pointer-events-none top-32 left-2.5 rounded-full py-0.5 px-1 bg-gray-200/80 dark:bg-gray-600/80 backdrop-blur-sm"
		>
			<span class="dark:text-white text-black">{client_ping.toFixed(0)}ms</span>
		</div>
	{/if}
</div>

<style lang="scss">
	.action-bar {
		@apply fixed bottom-0 left-0 w-full;
		.row {
			@apply w-full grid grid-cols-9;
			button {
				@apply rounded-none duration-150;
			}
		}
	}
</style>
