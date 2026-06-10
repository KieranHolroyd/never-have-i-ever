<script lang="ts">
	import { Status, type Player } from '$lib/types';
	import ConnectionInfoPanel from './ConnectionInfoPanel.svelte';
	import { Button } from '$lib/components/ui/button';
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
</script>

<div class="bg-background text-foreground relative min-h-screen">
	<header
		class="bg-background/80 sticky top-14 z-20 border-b px-3 py-2.5 backdrop-blur-xl sm:px-4"
	>
		<div class="mx-auto flex max-w-4xl items-center justify-between gap-3">
			<!-- Left: contextual info slot -->
			<div class="flex min-w-0 flex-1 items-center gap-2">
				<span class="text-foreground hidden shrink-0 text-sm font-bold sm:block">NHIE</span>
				<div class="bg-border hidden h-4 w-px shrink-0 sm:block"></div>
				{#if headerInfo}
					{@render headerInfo()}
				{/if}
			</div>

			<!-- Right: actions -->
			<div class="flex shrink-0 items-center gap-0.5">
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

	<main
		class="mx-auto w-full max-w-4xl px-3 sm:px-4 {currentStep === 'play'
			? 'pb-[calc(env(safe-area-inset-bottom)+13rem)] lg:pb-[calc(env(safe-area-inset-bottom)+9rem)]'
			: ''}"
	>
		{@render children?.()}
	</main>

	<ConnectionInfoPanel {connection} {players} {errors} {ping} />
</div>
