<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MdiCheck from '~icons/mdi/check';
	import MdiClose from '~icons/mdi/close';
	import MdiCrown from '~icons/mdi/crown';
	import MdiMagnify from '~icons/mdi/magnify';
	import MdiChevronDown from '~icons/mdi/chevron-down';
	import { InputGroup, InputGroupAddon, InputGroupInput } from '$lib/components/ui/input-group';
	import { Button } from '$lib/components/ui/button';
	import { Toggle } from '$lib/components/ui/toggle';
	import { Slider } from '$lib/components/ui/slider';
	import { Badge } from '$lib/components/ui/badge';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import {
		Empty,
		EmptyDescription,
		EmptyHeader,
		EmptyMedia,
		EmptyTitle
	} from '$lib/components/ui/empty';
	import {
		Item,
		ItemContent,
		ItemDescription,
		ItemGroup,
		ItemTitle
	} from '$lib/components/ui/item';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { Separator } from '$lib/components/ui/separator';
	import type { CardPack, SelectedPacks } from '$lib/types';
	import { getCardPacks, calculateTotalCards } from '$lib/card-packs';
	import posthog from 'posthog-js';

	const BASE_PACK_ID = 'CAH Base Set';

	interface Props {
		gameId: string;
		embedded?: boolean;
		onPacksSelected?: (
			packs: string[],
			settings: { maxRounds: number; handSize: number; maxPlayers: number }
		) => void;
	}

	let { gameId, embedded = false, onPacksSelected }: Props = $props();

	let selectedPacks: SelectedPacks = $state({});
	let showNSFW: boolean = $state(true);
	let showCommunity: boolean = $state(false);
	let cardPacks: CardPack[] = $state([]);
	let isLoadingPacks: boolean = $state(true);
	let loadError: string | null = $state(null);
	let searchQuery: string = $state('');
	let showAllPacks: boolean = $state(false);

	let maxRounds: number = $state(10);
	let handSize: number = $state(7);
	let maxPlayers: number = $state(20);

	let isStarting: boolean = $state(false);

	onMount(() => {
		loadCardPacks();
	});

	async function loadCardPacks() {
		try {
			isLoadingPacks = true;
			loadError = null;
			const packs = await getCardPacks();
			cardPacks = packs;

			const basePack = packs.find((pack) => pack.id === BASE_PACK_ID);
			if (basePack) {
				selectedPacks[basePack.id] = true;
			}
		} catch (error) {
			console.error('Failed to load card packs:', error);
			loadError = 'Failed to load card packs. Please refresh the page.';
		} finally {
			isLoadingPacks = false;
		}
	}

	function togglePack(packId: string) {
		const basePack = cardPacks.find((pack) => pack.id === BASE_PACK_ID);
		if (basePack && packId === basePack.id) return;

		selectedPacks[packId] = !selectedPacks[packId];
	}

	function getFilteredPacks(): CardPack[] {
		let filtered = cardPacks.filter((pack) => {
			if (!showNSFW && pack.isNSFW) return false;
			if (!showCommunity && !pack.isOfficial) return false;
			if (searchQuery.trim()) {
				return pack.name.toLowerCase().includes(searchQuery.toLowerCase());
			}
			return true;
		});

		filtered = filtered.sort((a, b) => {
			if (a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1;
			return a.name.localeCompare(b.name);
		});

		if (!searchQuery.trim() && !showAllPacks) {
			filtered = filtered.slice(0, 6);
		}

		return filtered;
	}

	function getSelectedPackIds(): string[] {
		return Object.keys(selectedPacks).filter((id) => selectedPacks[id]);
	}

	function getTotalFilteredPacks(): number {
		return cardPacks.filter((pack) => {
			if (!showNSFW && pack.isNSFW) return false;
			if (!showCommunity && !pack.isOfficial) return false;
			if (searchQuery.trim()) {
				return pack.name.toLowerCase().includes(searchQuery.toLowerCase());
			}
			return true;
		}).length;
	}

	function startGame() {
		const selectedIds = getSelectedPackIds();
		if (selectedIds.length === 0) {
			loadError = 'Please select at least one card pack to continue.';
			return;
		}
		const currentTotals = calculateTotalCards(selectedIds);
		posthog.capture('cah_packs_selected', {
			pack_count: selectedIds.length,
			pack_ids: selectedIds,
			total_black_cards: currentTotals.totalBlack,
			total_white_cards: currentTotals.totalWhite,
			max_rounds: maxRounds,
			hand_size: handSize,
			max_players: maxPlayers
		});
		if (onPacksSelected) {
			onPacksSelected(selectedIds, { maxRounds, handSize, maxPlayers });
			isStarting = true;
		} else {
			goto(`/play/${gameId}/cards-against-humanity`);
			isStarting = true;
		}
	}

	function goBack() {
		goto('/play/name');
	}

	let filteredPacks = $derived(getFilteredPacks());
	let selectedIds = $derived(getSelectedPackIds());
	let totals = $derived(calculateTotalCards(selectedIds));
	let totalFilteredPacks = $derived(getTotalFilteredPacks());
	let shouldShowMoreButton = $derived(
		totalFilteredPacks > 6 && !searchQuery.trim() && !showAllPacks
	);
	let selectedPackList = $derived(cardPacks.filter((pack) => selectedIds.includes(pack.id)));
</script>

<div class="pb-24" data-testid="cah-pack-selection">
	{#if !embedded}
		<div class="mb-6 flex items-center justify-between gap-4">
			<div>
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-widest">
					Cards Against Humanity
				</p>
				<h1 class="text-2xl font-bold">Choose your card packs</h1>
			</div>
			<Button type="button" variant="secondary" onclick={goBack}>
				<MdiClose />
				Cancel
			</Button>
		</div>
	{:else}
		<div class="mb-4">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-widest">Packs</p>
			<h2 class="text-2xl font-bold">Pick your decks</h2>
			<p class="text-muted-foreground mt-1 text-sm">
				{selectedIds.length > 0
					? `${selectedIds.length} selected`
					: 'Select at least one pack to continue'}
			</p>
		</div>
	{/if}

	{#if isStarting}
		<Empty class="border-solid" data-testid="cah-waiting">
			<EmptyHeader>
				<EmptyMedia>
					<Spinner class="size-8" />
				</EmptyMedia>
				<EmptyTitle>Waiting for players</EmptyTitle>
				<EmptyDescription>
					Packs sent to server. Room opens when the table is ready.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	{:else}
		<div class="flex items-start gap-6 p-4 sm:p-6 lg:p-8">
			<div class="min-w-0 flex-1 space-y-4 pb-28 lg:pb-4">
				<Card>
					<CardContent>
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
							<InputGroup class="flex-1">
								<InputGroupAddon>
									<MdiMagnify />
								</InputGroupAddon>
								<InputGroupInput
									type="search"
									bind:value={searchQuery}
									placeholder="Search card packs…"
								/>
							</InputGroup>
							<div class="flex items-center gap-2">
								<Toggle bind:pressed={showNSFW} variant="outline" size="sm">NSFW</Toggle>
								<Toggle bind:pressed={showCommunity} variant="outline" size="sm">Community</Toggle>
							</div>
						</div>
					</CardContent>
				</Card>

				<div class="grid grid-cols-3 gap-3">
					<Card size="sm">
						<CardContent>
							<p class="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
								Visible
							</p>
							<p class="mt-1 text-2xl font-bold">{totalFilteredPacks}</p>
						</CardContent>
					</Card>
					<Card size="sm">
						<CardContent>
							<p class="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
								Selected
							</p>
							<p class="mt-1 text-2xl font-bold">{selectedIds.length}</p>
						</CardContent>
					</Card>
					<Card size="sm">
						<CardContent>
							<p class="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
								Cards
							</p>
							<p class="mt-1 text-2xl font-bold">{totals.totalWhite + totals.totalBlack}</p>
						</CardContent>
					</Card>
				</div>

				{#if isLoadingPacks}
					<Empty class="border-solid">
						<EmptyHeader>
							<EmptyMedia>
								<Spinner class="size-8" />
							</EmptyMedia>
							<EmptyTitle>Loading card packs…</EmptyTitle>
						</EmptyHeader>
					</Empty>
				{:else if loadError}
					<Alert variant="destructive">
						<AlertTitle>Failed to load packs</AlertTitle>
						<AlertDescription>{loadError}</AlertDescription>
					</Alert>
					<Button type="button" variant="outline" onclick={loadCardPacks}>Try again</Button>
				{:else}
					<Card>
						<CardHeader>
							<CardDescription>Packs</CardDescription>
							<CardTitle>Available packs</CardTitle>
							{#if searchQuery.trim()}
								<Badge variant="outline">Searching</Badge>
							{/if}
						</CardHeader>
						<CardContent>
							<div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
								{#each filteredPacks as pack (pack.id)}
									{@const isSelected = selectedPacks[pack.id]}
									{@const isBaseGame = pack.id === BASE_PACK_ID}
									<Card
										class="min-h-[13rem] cursor-pointer transition-all {isSelected
											? 'ring-2 ring-foreground'
											: ''}"
										onclick={() => togglePack(pack.id)}
									>
										<CardContent class="flex h-full flex-col">
											<div class="mb-2 flex items-start justify-between gap-3">
												<div class="flex-1">
													<div class="mb-0.5 flex items-center gap-1.5">
														<CardTitle class="text-sm leading-tight">{pack.name}</CardTitle>
														{#if pack.isOfficial}
															<MdiCrown class="size-3.5 shrink-0 text-amber-400" />
														{/if}
													</div>
													<CardDescription>
														{pack.isOfficial ? 'Official' : 'Community'}
													</CardDescription>
												</div>
												{#if isSelected}
													<Badge variant="default">
														<MdiCheck />
													</Badge>
												{/if}
											</div>

											<div class="mt-auto grid grid-cols-2 gap-2">
												<Card size="sm">
													<CardContent>
														<p class="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
															Black
														</p>
														<p class="mt-0.5 font-bold">{pack.blackCards}</p>
													</CardContent>
												</Card>
												<Card size="sm">
													<CardContent>
														<p class="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
															White
														</p>
														<p class="mt-0.5 font-bold">{pack.whiteCards}</p>
													</CardContent>
												</Card>
											</div>

											<div class="mt-3 flex items-center justify-between">
												{#if pack.isNSFW}
													<Badge variant="destructive">NSFW</Badge>
												{:else}
													<Badge variant="secondary">Clean</Badge>
												{/if}
												{#if isBaseGame}
													<span class="text-muted-foreground text-[11px] font-medium">Required</span>
												{:else if isSelected}
													<span class="text-muted-foreground text-[11px] font-medium">Selected</span>
												{:else}
													<span class="text-muted-foreground text-[11px]">Tap to add</span>
												{/if}
											</div>
										</CardContent>
									</Card>
								{/each}
							</div>

							{#if shouldShowMoreButton}
								<div class="mt-5 flex justify-center">
									<Button type="button" variant="outline" onclick={() => (showAllPacks = true)}>
										Show {totalFilteredPacks - 6} more
										<MdiChevronDown />
									</Button>
								</div>
							{/if}
						</CardContent>
					</Card>
				{/if}
			</div>

			<aside class="hidden w-72 shrink-0 lg:sticky lg:top-[3.5rem] lg:block lg:self-start xl:w-80">
				<Card>
					<CardHeader class="border-b [.border-b]:pb-3">
						<CardTitle class="text-sm">Deck summary</CardTitle>
					</CardHeader>

					<div class="grid grid-cols-2 divide-x">
						<CardContent>
							<p class="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
								Black
							</p>
							<p class="mt-1 text-2xl font-bold">{totals.totalBlack}</p>
						</CardContent>
						<CardContent>
							<p class="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
								White
							</p>
							<p class="mt-1 text-2xl font-bold">{totals.totalWhite}</p>
						</CardContent>
					</div>

					<Separator />

					{#if selectedPackList.length > 0}
						<CardContent class="p-0">
							<ItemGroup>
								{#each selectedPackList.slice(0, 8) as pack (pack.id)}
									<Item variant="outline">
										<ItemContent>
											<ItemTitle class="truncate">{pack.name}</ItemTitle>
											<ItemDescription>
												{pack.blackCards + pack.whiteCards} cards
											</ItemDescription>
										</ItemContent>
										{#if pack.isOfficial}
											<MdiCrown class="size-3.5 shrink-0 text-amber-400" />
										{/if}
									</Item>
								{/each}
								{#if selectedPackList.length > 8}
									<Item variant="outline">
										<ItemDescription>+{selectedPackList.length - 8} more</ItemDescription>
									</Item>
								{/if}
							</ItemGroup>
						</CardContent>
					{:else}
						<CardContent>
							<p class="text-muted-foreground text-center text-sm">No packs selected</p>
						</CardContent>
					{/if}

					<Separator />

					<CardContent class="space-y-3">
						<p class="text-muted-foreground text-xs font-medium uppercase tracking-widest">Settings</p>

						<Field>
							<div class="mb-1.5 flex items-center justify-between">
								<FieldLabel for="max-rounds-desktop">Max rounds</FieldLabel>
								<span class="text-xs font-bold">{maxRounds}</span>
							</div>
							<Slider type="single" id="max-rounds-desktop" bind:value={maxRounds} min={3} max={50} step={1} />
						</Field>

						<Field>
							<div class="mb-1.5 flex items-center justify-between">
								<FieldLabel for="hand-size-desktop">Hand size</FieldLabel>
								<span class="text-xs font-bold">{handSize} cards</span>
							</div>
							<Slider type="single" id="hand-size-desktop" bind:value={handSize} min={3} max={15} step={1} />
						</Field>

						<Field>
							<div class="mb-1.5 flex items-center justify-between">
								<FieldLabel for="max-players-desktop">Room size</FieldLabel>
								<span class="text-xs font-bold">{maxPlayers} players</span>
							</div>
							<Slider
								type="single"
								id="max-players-desktop"
								bind:value={maxPlayers}
								min={3}
								max={20}
								step={1}
							/>
						</Field>
					</CardContent>

					<CardFooter class="border-t">
						<Button
							type="button"
							class="w-full"
							onclick={startGame}
							disabled={selectedIds.length === 0}
						>
							Start game
						</Button>
					</CardFooter>
				</Card>
			</aside>
		</div>

		<div class="sticky bottom-3 z-20 px-4 lg:hidden">
			<Card>
				<CardContent class="space-y-3">
					<div class="grid grid-cols-3 gap-3">
						<Field>
							<div class="mb-1 flex items-center justify-between">
								<FieldLabel for="max-rounds-mobile" class="text-[10px] uppercase">Rounds</FieldLabel>
								<span class="text-xs font-bold">{maxRounds}</span>
							</div>
							<Slider
								type="single"
								id="max-rounds-mobile"
								bind:value={maxRounds}
								min={3}
								max={50}
								step={1}
							/>
						</Field>
						<Field>
							<div class="mb-1 flex items-center justify-between">
								<FieldLabel for="hand-size-mobile" class="text-[10px] uppercase">Hand</FieldLabel>
								<span class="text-xs font-bold">{handSize}</span>
							</div>
							<Slider type="single" id="hand-size-mobile" bind:value={handSize} min={3} max={15} step={1} />
						</Field>
						<Field>
							<div class="mb-1 flex items-center justify-between">
								<FieldLabel for="max-players-mobile" class="text-[10px] uppercase">Seats</FieldLabel>
								<span class="text-xs font-bold">{maxPlayers}</span>
							</div>
							<Slider
								type="single"
								id="max-players-mobile"
								bind:value={maxPlayers}
								min={3}
								max={20}
								step={1}
							/>
						</Field>
					</div>
					<div class="flex items-center justify-between gap-4">
						<div>
							<p class="text-sm font-medium">
								{selectedIds.length} pack{selectedIds.length !== 1 ? 's' : ''}
							</p>
							<p class="text-muted-foreground text-xs">
								{totals.totalBlack}B / {totals.totalWhite}W cards
							</p>
						</div>
						<Button
							type="button"
							variant="emerald"
							class="shrink-0"
							onclick={startGame}
							disabled={selectedIds.length === 0}
						>
							Start game ({selectedIds.length})
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
