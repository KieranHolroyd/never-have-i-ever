<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { LocalPlayer } from '$lib/player';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { Status, VoteOptions, type Player } from '$lib/types';
	import ConnectionInfoPanel from './ConnectionInfoPanel.svelte';

	export let id: string;

	let error: string | null = null;

	const colour_map: Record<string, string> = {
		null: 'dark:bg-gray-800 bg-gray-400 text-white rounded-md shadow-md',
		Have: 'bg-green-400 dark:bg-opacity-50 text-white rounded-md shadow-md',
		Kinda: 'bg-blue-400 dark:bg-opacity-50 text-white rounded-md shadow-md',
		'Have Not': 'bg-red-400 dark:bg-opacity-50 text-white rounded-md shadow-md'
	};
	let connection: Status = Status.CONNECTING;
	let player_id: string | null = null;
	let errors: any[] = [];
	let players: Player[] = [];

	let my_name = LocalPlayer.name;

	let data: {
		[key: (typeof available_catagories)[number]]: string[];
	} = {};
	let data_base = {};
	let current_question: {
		content: string;
		catagory: string;
	} | null = null;
	let conf_reset_display = false;
	const available_catagories = [
		'food',
		'guys',
		'dirty',
		'funny',
		'games',
		'girls',
		'gross',
		'rules',
		'random',
		'couples',
		'embarassing',
		'more'
	];
	let game_state: {
		catagory_select: boolean;
		game_completed: boolean;
		current_catagory: string[];
	} = {
		catagory_select: true,
		game_completed: false,
		current_catagory: []
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
	// onMount(() => {
	//   const onShake = new Shake({
	//     threshold: 15,
	//     timeout: 2500
	//   });
	//   onShake.start();

	//   window.addEventListener("shake", onShakeHandler, false);
	// });

	// function onShakeHandler() {
	//   if (!game_state.catagory_select && !game_state.game_completed)
	//     selectQuestion();
	// }

	onMount(() => {
		if (LocalPlayer.name === null) return goto(`/play/name?redirect=/play/${id}`);
		player_id = LocalPlayer.id;
		setupsock();
		load();

		return () => {
			socket?.close(4000);
			socket = null;
		};
	});
	async function load() {
		const res = await fetch('/data.json');
		let json_res = JSON.stringify(await res.json());
		data_base = JSON.parse(json_res);
		data = JSON.parse(json_res);
	}

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
		}
	}
	function selectCatagories() {
		// let newState = game_state;
		// newState.catagory_select = true;
		// game_state = { ...newState };
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
		//update game state to clear the game
		// let newState = game_state;
		// newState.game_completed = false;
		// newState.catagory_select = true;
		// newState.current_catagory = [];
		// game_state = { ...newState };
		// //reset to api data
		// data = data_base;
		// set conf display to false
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
				console.log(data.op, data);
				switch (data.op) {
					case 'open':
						connection = Status.CONNECTED;
						break;
					case 'select_catagory':
						toggleSelection(data.catagory);
						break;
					case 'game_state':
						game_state.current_catagory = data.game.catagories;
						game_state.catagory_select = data.game.catagory_select;
						game_state.game_completed = data.game.game_completed;

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
			if (event.code === 4000) return;
			setTimeout(reconnect, 200 * Math.max(1, retry_count));
		});

		// error handler
		socket?.addEventListener('error', (event) => {
			connection = Status.DISCONNECTED;
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
	/// ----------------
</script>

<div class="dark:text-white text-black text-center">
	{#if !game_state.game_completed}
		{#if game_state.catagory_select}
			<div
				class="w-64 mx-auto my-6 columns-1 dark:text-white dark:bg-gray-800 bg-white border-2 dark:border-gray-600 border-gray-200 shadow rounded-md"
			>
				<p class="text-xl font-semibold py-2 dark:bg-black bg-gray-200 rounded-t-md">
					Select Catagories
				</p>
				{#each available_catagories as cat}
					<label class="my-[2px]">
						<div
							class="py-1 px-4 w-full text-left text-lg capitalize font-semibold hover:bg-gray-100 hover:dark:bg-gray-600 duration-75"
						>
							<input
								type="checkbox"
								class=""
								bind:group={game_state.current_catagory}
								on:change={() => emitSelectCatagory(cat)}
								value={cat}
								checked={game_state.current_catagory.includes(cat)}
							/>
							<span class="float-right">{cat}</span>
						</div>
					</label>
				{/each}
			</div>
			<button class="green-button" on:click={() => confirmSelections()}> Continue </button>
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
						Reset
					</button>
					<button
						class="text-white bg-green-500 hover:bg-green-400 text-xl md:text-4xl p-4 col-span-5"
						on:click={() => selectQuestion()}
					>
						Next Question
					</button>
					<button
						class="text-white bg-gray-600 hover:bg-gray-400 col-span-2"
						on:dblclick={() => selectCatagories()}
					>
						Catagories
					</button>
				</div>
			</div>
		{/if}
	{:else}
		<p class="nomore">There are no more questions...</p>
		{#each players as player}
			<p class="question">
				{player.name} has {player.score} Have's
			</p>
		{/each}
		<button on:click={() => reset()}>Reset Game</button>
	{/if}
	{#if conf_reset_display}
		<hr />
		<button class="red-button" on:click={() => reset()}>Confirm Reset</button>
	{/if}
	<ConnectionInfoPanel {connection} {players} {errors} />
</div>

<style lang="scss">
	// .catagories {
	// 	width: 100%;
	// 	display: flex;
	// 	align-content: space-between;
	// 	flex-direction: row;
	// 	flex-wrap: wrap;
	// }
	// .catagory {
	// 	max-width: 200px;
	// 	margin: 12px auto;
	// 	padding: 2px 10px;
	// 	text-align: center;
	// }
	// .checktext {
	// 	margin: 10px 0;
	// }
	// .question_container {
	// 	margin: 10px auto;
	// 	max-width: 500px;
	// 	padding: 12px;
	// }
	// .question_container .small {
	// 	margin: 0;
	// 	text-transform: uppercase;
	// 	font-size: 12px;
	// 	font-weight: bold;
	// }
	// .question_container .question {
	// 	font-size: 18px;
	// 	margin: 4px 0;
	// }
	// .paper {
	// 	margin: 24px auto;
	// }
	// p.nomore {
	// 	text-align: center;
	// 	color: #afafaf;
	// 	font-size: 15px;
	// 	letter-spacing: 0.5px;
	// 	font-weight: bolder;
	// }

	.action-bar {
		@apply fixed bottom-0 left-0 w-full pb-8 bg-black;
		.row {
			@apply w-full grid grid-cols-9;
			button {
				@apply rounded-none duration-150;
			}
		}
	}
</style>
