<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { LocalPlayer } from '$lib/player';
	import { goto } from '$app/navigation';

	export let id: string;
	enum Status {
		CONNECTING,
		CONNECTED,
		DISCONNECTED
	}
	enum VoteOptions {
		Have = 1,
		HaveNot = 2
	}
	let connection: Status = Status.CONNECTING;
	let player_id: string | null = null;
	let errors: any[] = [];
	let players: {
		id: string;
		name: string;
		score: number;

		connected: boolean;
		voted_this_round: boolean;
	}[] = [];

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
		'embarassing'
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
		socket?.send(JSON.stringify({ op: 'next_question' }));
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

<div class="board text-center">
	{#if !game_state.game_completed}
		{#if game_state.catagory_select}
			<div class="catagories">
				{#each available_catagories as cat}
					<div class="catagory">
						<label class="checktext">
							<input
								type="checkbox"
								class="catagory"
								bind:group={game_state.current_catagory}
								on:change={() => emitSelectCatagory(cat)}
								value={cat}
								checked={game_state.current_catagory.includes(cat)}
							/>
							<span>{cat}</span>
						</label>
					</div>
				{/each}
			</div>
			<button class="green-button" on:click={() => confirmSelections()}> Continue </button>
		{:else}
			{#if current_question?.content !== undefined}
				<div class="paper question_container">
					<p class="small">Catagory: {current_question?.catagory}</p>
					<p class="question">{current_question?.content}</p>
				</div>
				{#if current_round.votes.length > 0}
					<div class="paper question_container">
						<p class="small">Votes</p>
						{#each current_round.votes as vote}
							<p class="question">
								{vote.player.name}: {vote.voted}
							</p>
						{/each}
					</div>
				{/if}
			{:else}
				<h2>Choose a question</h2>
			{/if}
			<hr />
			<button class="red-button" on:click={() => conf_reset()}> Reset Game </button>
			<button style="width: auto;" on:click={() => selectCatagories()}>
				Return to catagory selection
			</button>
			<button class="green-button" on:click={() => selectQuestion()}> Next Question </button>

			<div class="have_not">
				<button class="p-1 hover:bg-green-400" on:click={() => vote(VoteOptions.Have)}>have</button>
				<button class="p-1 hover:bg-red-400" on:click={() => vote(VoteOptions.HaveNot)}>
					have not
				</button>
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
	<div class="connection_info">
		{#if connection === Status.CONNECTING}
			Connecting...
		{:else if connection === Status.CONNECTED}
			Connected
		{:else if connection === Status.DISCONNECTED}
			Disconnected
		{/if}
		<br />
		<details>
			<summary
				>({players.filter((p) => p.connected).length} player{players.length > 1
					? 's'
					: ''})</summary
			>
			<ul>
				{#each players.filter((p) => p.connected === true) as player}
					<li>
						{player.name} ({player.score})
					</li>
				{/each}
			</ul>
		</details>
		<details>
			<summary>Debug</summary>
			<ul>
				{#each errors as error}
					<li>{error.message}</li>
				{/each}
			</ul>
		</details>
	</div>
</div>

<style>
	button {
		margin: 12px 6px;
		width: auto;
		padding-right: 8px;
		padding-left: 8px;
	}
	.catagories {
		width: 100%;
		display: flex;
		align-content: space-between;
		flex-direction: row;
		flex-wrap: wrap;
	}
	.catagory {
		max-width: 200px;
		margin: 12px auto;
		padding: 2px 10px;
		text-align: center;
	}
	.checktext {
		margin: 10px 0;
	}
	.question_container {
		margin: 10px auto;
		max-width: 500px;
		padding: 12px;
	}
	.question_container .small {
		margin: 0;
		text-transform: uppercase;
		font-size: 12px;
		font-weight: bold;
	}
	.question_container .question {
		font-size: 18px;
		margin: 4px 0;
	}
	.paper {
		margin: 24px auto;
	}
	p.nomore {
		text-align: center;
		color: #afafaf;
		font-size: 15px;
		letter-spacing: 0.5px;
		font-weight: bolder;
	}

	.connection_info {
		@apply fixed border-2 border-black bottom-2 right-2 p-2 bg-gray-200 rounded-md;
	}
	.have_not {
		@apply fixed border-2 border-blue-400 bottom-2 left-2 p-2 bg-gray-200 rounded-md;
	}
</style>
