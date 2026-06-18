<script lang="ts">
	import { Status, type Player } from '$lib/types';
	import ConnectionInfoPanel from './ConnectionInfoPanel.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import MdiShareOutline from '~icons/mdi/share-outline';
	import MdiDotsVertical from '~icons/mdi/dots-vertical';
	import MdiUndoVariant from '~icons/mdi/undo-variant';
	import MdiListBox from '~icons/mdi/list-box';

	export type NhieStep = 'lobby' | 'categories' | 'play' | 'results';

	interface Props {
		currentStep: NhieStep;
		connection?: Status;
		players?: Player[];
		errors?: any[];
		ping?: number;
		children?: import('svelte').Snippet;
		headerInfo?: import('svelte').Snippet;
		onShare?: () => void;
		showPlayMenu?: boolean;
		onReset?: () => void;
		onOpenCategories?: () => void;
		confirmResetVisible?: boolean;
	}

	let {
		currentStep,
		connection = Status.DISCONNECTED,
		players = [],
		errors = [],
		ping = 0,
		children,
		headerInfo,
		onShare,
		showPlayMenu = false,
		onReset,
		onOpenCategories,
		confirmResetVisible = false
	}: Props = $props();

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
			: connection === Status.CONNECTING
				? 'Connecting…'
				: 'Offline'
	);

	const connectionDotClass = $derived(
		connection === Status.CONNECTED
			? 'bg-emerald-500'
			: connection === Status.CONNECTING
				? 'animate-pulse bg-amber-500'
				: 'bg-destructive'
	);

	const mainClass = $derived(
		currentStep === 'play' ? 'nhie-main nhie-main--play' : 'nhie-main'
	);

	const headerClass = $derived(
		currentStep === 'play'
			? 'py-1.5 sm:py-2'
			: 'py-2 sm:py-2.5'
	);
</script>

<div class="nhie-shell bg-background text-foreground relative">
	<header
		class="nhie-game-header bg-background/80 sticky z-20 border-b px-3 backdrop-blur-xl sm:px-4 {headerClass}"
	>
		<div class="mx-auto flex h-full max-w-4xl items-center justify-between gap-2 sm:gap-3">
			<div class="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
				<span class="text-foreground hidden shrink-0 text-sm font-bold sm:block">NHIE</span>
				<div class="bg-border hidden h-4 w-px shrink-0 sm:block"></div>
				{#if headerInfo}
					<div class="min-w-0 flex-1 overflow-hidden">
						{@render headerInfo()}
					</div>
				{/if}
			</div>

			<div class="flex shrink-0 items-center gap-0.5">
				<Badge
					variant={connectionVariant}
					class="hidden h-6 gap-1 px-1.5 text-[10px] sm:inline-flex"
					title={connectionLabel}
				>
					<span class="size-1.5 rounded-full {connectionDotClass}"></span>
					{connectionLabel}
				</Badge>
				<span
					class="size-2 shrink-0 rounded-full sm:hidden {connectionDotClass}"
					title={connectionLabel}
					aria-label={connectionLabel}
				></span>
				{#if onShare}
					<Button variant="ghost" size="icon-sm" title="Share game" onclick={onShare}>
						<MdiShareOutline />
					</Button>
				{/if}
				{#if showPlayMenu}
					<DropdownMenu>
						<DropdownMenuTrigger>
							{#snippet child({ props })}
								<Button {...props} variant="ghost" size="icon-sm" title="More actions">
									<MdiDotsVertical />
								</Button>
							{/snippet}
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{#if onOpenCategories}
								<DropdownMenuItem onclick={onOpenCategories}>
									<MdiListBox />
									Change categories
								</DropdownMenuItem>
							{/if}
							{#if onReset}
								<DropdownMenuSeparator />
								<DropdownMenuItem variant="destructive" onclick={onReset}>
									<MdiUndoVariant />
									{confirmResetVisible ? 'Confirm reset' : 'Reset game'}
								</DropdownMenuItem>
							{/if}
						</DropdownMenuContent>
					</DropdownMenu>
				{/if}
			</div>
		</div>
	</header>

	<main class="mx-auto w-full max-w-4xl px-3 sm:px-4 {mainClass}">
		{@render children?.()}
	</main>

	<ConnectionInfoPanel {connection} {players} {errors} {ping} />
</div>
