<script lang="ts">
	import type { CAHGameState } from '$lib/types';

	interface Props {
		gameState: CAHGameState;
	}

	let { gameState }: Props = $props();

	const connectedPlayers = $derived(gameState.players.filter((p) => p.connected));
	const isReady = $derived(connectedPlayers.length >= 3);

	let copied = $state(false);

	function copyInviteLink() {
		const url = window.location.href;
		navigator.clipboard.writeText(url).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}
</script>

<div class="space-y-4" data-testid="cah-waiting">
	<!-- Status -->
	<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-6">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-[11px] font-black uppercase tracking-[0.3em] text-white/30">Lobby</p>
				<h2 class="mt-1 text-xl font-black text-white">
					{isReady ? 'Ready to start' : 'Waiting for players'}
				</h2>
				<p class="mt-1 text-sm text-white/40">
					{isReady
						? 'Enough players are in — the game will begin shortly.'
						: `Need ${3 - connectedPlayers.length} more player${3 - connectedPlayers.length === 1 ? '' : 's'} to start.`}
				</p>
			</div>
			<div
				class="shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold
				{isReady
					? 'border-green-400/20 bg-green-500/[0.08] text-green-400/80'
					: 'border-white/10 bg-white/[0.05] text-white/40'}"
			>
				{connectedPlayers.length} / 3+
			</div>
		</div>

		<!-- Progress -->
		<div class="mt-5 h-[3px] overflow-hidden rounded-full bg-white/10">
			<div
				class="h-[3px] rounded-full transition-all duration-500 {isReady
					? 'bg-green-400'
					: 'bg-white'}"
				style="width: {Math.min((connectedPlayers.length / 3) * 100, 100)}%"
			></div>
		</div>
	</div>

	<!-- Invite link -->
	<div class="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
		<p class="text-sm font-bold text-white/70">Invite friends</p>
		<p class="mt-0.5 text-sm text-white/30">Share the room link to fill the table.</p>
		<button
			class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all duration-200
			{copied
				? 'border-green-400/20 bg-green-500/[0.08] text-green-400'
				: 'border-white/10 bg-white/[0.05] text-white/50 hover:border-white/20 hover:bg-white/[0.08] hover:text-white/70'}"
			onclick={copyInviteLink}
		>
			{#if copied}
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 101.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				Link copied!
			{:else}
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
					<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
					<path
						d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"
					/>
				</svg>
				Copy invite link
			{/if}
		</button>
	</div>
</div>
