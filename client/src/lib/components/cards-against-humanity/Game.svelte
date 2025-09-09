<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { env } from '$env/dynamic/public';
  import { LocalPlayer } from '$lib/player';
  import { Status, type Player } from '$lib/types';

  interface Props { id: string }
  let { id }: Props = $props();

  let socket: WebSocket | null = null;
  let connection: Status = $state(Status.CONNECTING);
  let players: Player[] = $state([]);
  let error: string | null = $state(null);

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
      socket?.send(JSON.stringify({ op: 'join_game', create: true, playername: LocalPlayer.name }));
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.op === 'game_state') {
          players = data.game.players;
        }
      } catch (_) {}
    });

    socket.addEventListener('close', () => {
      connection = Status.DISCONNECTED;
    });

    socket.addEventListener('error', () => {
      connection = Status.DISCONNECTED;
      error = 'WebSocket error';
    });
  }

  onMount(() => { connect(); return () => { socket?.close(); socket = null; }; });
  onDestroy(() => { try { socket?.close(); } catch (_) {} socket = null; });
</script>

<div class="text-center">
  <h1 class="text-2xl font-semibold">Cards Against Humanity</h1>
  {#if error}
    <p class="text-red-600">{error}</p>
  {/if}
  <p class="text-sm opacity-70">Status: {connection}</p>
  <div class="mx-auto my-4 max-w-md">
    <p class="text-xs uppercase font-bold">Players</p>
    {#each players.filter(p => p.connected) as player}
      <div class="my-1 p-1 font-bold" data-testid={`player-${player.name}`}>{player.name}</div>
    {/each}
  </div>
  <p class="text-sm opacity-60">Game UI coming soon.</p>
  <p class="text-xs opacity-50">Connected to engine via playing=cards-against-humanity</p>
  <button class="mt-4 px-3 py-2 bg-gray-200 rounded" onclick={() => socket?.send(JSON.stringify({ op: 'ping' }))}>Ping</button>
  <button class="mt-4 ml-2 px-3 py-2 bg-gray-200 rounded" onclick={() => socket?.send(JSON.stringify({ op: 'reset_game' }))}>Reset (NHIE-compatible)</button>
</div>


