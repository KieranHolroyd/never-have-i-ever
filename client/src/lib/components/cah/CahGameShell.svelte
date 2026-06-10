<script lang="ts">
	import { Status } from '$lib/types';
	import SitePhaseStepper from '$lib/components/ui/SitePhaseStepper.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import MdiShareOutline from '~icons/mdi/share-outline';
	import MdiDotsVertical from '~icons/mdi/dots-vertical';
	import MdiUndoVariant from '~icons/mdi/undo-variant';
	import MdiCardsPlayingOutline from '~icons/mdi/cards-playing-outline';

	export type CahStep = 'packs' | 'lobby' | 'play' | 'results';

	interface Props {
		currentStep: CahStep;
		connection?: Status;
		children?: import('svelte').Snippet;
		onShare?: () => void;
		showPlayMenu?: boolean;
		onReset?: () => void;
		onChangePacks?: () => void;
	}

	let {
		currentStep,
		connection = Status.DISCONNECTED,
		children,
		onShare,
		showPlayMenu = false,
		onReset,
		onChangePacks
	}: Props = $props();

	const steps = [
		{ id: 'packs', label: 'Packs' },
		{ id: 'lobby', label: 'Lobby' },
		{ id: 'play', label: 'Play' },
		{ id: 'results', label: 'Results' }
	];

	const connectionVariant = $derived(
		connection === Status.CONNECTED
			? 'default'
			: connection === Status.DISCONNECTED
				? 'destructive'
				: 'secondary'
	);

	const connectionLabel = $derived(
		connection === Status.CONNECTED
			? 'Connected'
			: connection === Status.DISCONNECTED
				? 'Offline'
				: 'Joining'
	);
</script>

<div class="bg-background text-foreground min-h-screen">
	<header class="bg-background/95 sticky top-14 z-20 border-b px-3 py-2 backdrop-blur-md sm:px-4">
		<div class="mx-auto flex max-w-3xl items-center justify-between gap-2">
			<SitePhaseStepper {steps} currentStep={currentStep} accent="violet" />

			<div class="flex shrink-0 items-center gap-1">
				<Badge variant={connectionVariant} class="hidden text-[10px] sm:inline-flex">
					{connectionLabel}
				</Badge>
				<span
					class="size-2 rounded-full sm:hidden {connection === Status.CONNECTING
						? 'bg-muted-foreground animate-pulse'
						: connection === Status.CONNECTED
							? 'bg-violet-500'
							: 'bg-destructive'}"
					title={connectionLabel}
				></span>
				{#if onShare}
					<Button variant="ghost" size="icon-sm" title="Share game" onclick={onShare}>
						<MdiShareOutline />
					</Button>
				{/if}
				{#if showPlayMenu}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="ghost" size="icon-sm" title="More actions">
									<MdiDotsVertical />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							{#if onChangePacks}
								<DropdownMenu.Item onclick={onChangePacks}>
									<MdiCardsPlayingOutline />
									Change packs
								</DropdownMenu.Item>
							{/if}
							{#if onReset}
								<DropdownMenu.Item variant="destructive" onclick={onReset}>
									<MdiUndoVariant />
									Reset game
								</DropdownMenu.Item>
							{/if}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			</div>
		</div>
	</header>

	<main class="px-3 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:px-4 lg:px-6">
		{@render children?.()}
	</main>
</div>
