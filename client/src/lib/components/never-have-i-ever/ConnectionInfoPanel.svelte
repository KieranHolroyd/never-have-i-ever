<script lang="ts">
	import { Status, type Player } from '$lib/types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Popover,
		PopoverContent,
		PopoverHeader,
		PopoverTitle,
		PopoverTrigger
	} from '$lib/components/ui/popover';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger
	} from '$lib/components/ui/collapsible';
	import MdiConnection from '~icons/mdi/connection';

	interface Props {
		connection?: Status;
		players?: Player[];
		errors?: any[];
		ping?: number;
	}

	let { connection = Status.DISCONNECTED, players = [], errors = [], ping = 0 }: Props = $props();

	const statusLabel = $derived(
		connection === Status.CONNECTED
			? 'Connected'
			: connection === Status.CONNECTING
				? 'Connecting…'
				: 'Disconnected'
	);

	const statusDotClass = $derived(
		connection === Status.CONNECTED
			? 'bg-emerald-500'
			: connection === Status.CONNECTING
				? 'animate-pulse bg-amber-500'
				: 'bg-destructive'
	);
</script>

<div class="fixed top-16 right-3 z-40">
	<Popover>
		<PopoverTrigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="outline"
					size="sm"
					class="bg-background/95 h-8 gap-1.5 px-2.5 shadow-sm backdrop-blur-sm"
					title="Connection details"
				>
					<span class="size-2 shrink-0 rounded-full {statusDotClass}"></span>
					<span class="hidden text-xs sm:inline">{statusLabel}</span>
					{#if ping > 0}
						<Badge variant="outline" class="hidden px-1.5 font-mono text-[10px] tabular-nums sm:inline-flex">
							{ping.toFixed(0)}ms
						</Badge>
					{/if}
					<MdiConnection class="text-muted-foreground size-3.5 sm:hidden" />
				</Button>
			{/snippet}
		</PopoverTrigger>
		<PopoverContent align="end" class="w-56 p-0">
			<PopoverHeader class="border-b px-3 py-2.5">
				<PopoverTitle class="flex items-center gap-2 text-sm">
					<span class="size-2 shrink-0 rounded-full {statusDotClass}"></span>
					{statusLabel}
				</PopoverTitle>
				{#if ping > 0}
					<p class="text-muted-foreground text-xs">
						Ping: <span class="font-mono tabular-nums">{ping.toFixed(0)}ms</span>
					</p>
				{/if}
			</PopoverHeader>

			{#if players.length > 0}
				<div class="px-3 py-2.5">
					<p class="text-muted-foreground mb-1.5 text-[10px] font-medium tracking-wide uppercase">
						Players
					</p>
					<ul class="space-y-1">
						{#each players as player (player.id)}
							<li
								class="flex items-center justify-between gap-2 text-xs {!player.connected
									? 'opacity-40'
									: ''}"
							>
								<span class="flex min-w-0 items-center gap-1.5">
									<span
										class="size-1.5 shrink-0 rounded-full {player.connected
											? 'bg-emerald-500'
											: 'bg-muted-foreground'}"
									></span>
									<span class="truncate">{player.name}</span>
								</span>
								<Badge variant="outline" class="shrink-0 font-mono">
									{player.score}
								</Badge>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if errors.length > 0}
				<Collapsible class="border-t px-3 py-2">
					<CollapsibleTrigger
						class="text-muted-foreground w-full text-left text-[10px] font-medium tracking-wide uppercase"
					>
						Debug ({errors.length})
					</CollapsibleTrigger>
					<CollapsibleContent>
						<ul class="text-muted-foreground mt-1 max-h-32 space-y-0.5 overflow-auto text-[10px]">
							{#each errors as error, index (index)}
								<li class="break-all">
									{error.error?.message ?? error.message ?? JSON.stringify(error)}
								</li>
							{/each}
						</ul>
					</CollapsibleContent>
				</Collapsible>
			{/if}
		</PopoverContent>
	</Popover>
</div>
