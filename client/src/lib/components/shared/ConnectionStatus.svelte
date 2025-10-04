<script lang="ts">
	import { connectionStore } from '../../stores/game-store';
	import { Status } from '../../types';

	interface Props {
		showPing?: boolean;
		compact?: boolean;
	}

	let { showPing = false, compact = false }: Props = $props();

	let connection = $connectionStore;
</script>

{#if compact}
	<div class="flex items-center gap-2 text-sm">
		<div class="flex items-center gap-1">
			<div
				class="w-2 h-2 rounded-full {connection.status === 'connected'
					? 'bg-green-400'
					: connection.status === 'connecting'
						? 'bg-yellow-400'
						: 'bg-red-400'}"
			></div>
			<span class="capitalize text-xs">
				{connection.status}
				{#if connection.isReconnecting}
					<span class="text-yellow-400 animate-pulse">(Reconnecting... {connection.reconnectAttempts}/10)</span>
				{/if}
			</span>
		</div>
		{#if showPing && connection.ping > 0}
			<span class="text-xs opacity-70">{connection.ping}ms</span>
		{/if}
	</div>
{:else}
	<div class="flex items-center justify-between mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/70">
		<div class="flex items-center gap-3">
			<div
				class="w-3 h-3 rounded-full {connection.status === 'connected'
					? 'bg-green-400'
					: connection.status === 'connecting'
						? 'bg-yellow-400'
						: 'bg-red-400'}"
			></div>
			<div>
				<p class="text-sm font-medium">
					Status: <span class="capitalize">
						{connection.status}
						{#if connection.isReconnecting}
							<span class="text-yellow-400 animate-pulse">(Reconnecting... {connection.reconnectAttempts}/10)</span>
						{/if}
					</span>
				</p>
				{#if showPing && connection.ping > 0}
					<p class="text-xs opacity-70">Ping: {connection.ping}ms</p>
				{/if}
			</div>
		</div>
	</div>
{/if}