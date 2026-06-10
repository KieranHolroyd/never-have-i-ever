<script lang="ts">
	import { page } from '$app/state';
	import type { Component } from 'svelte';
	import MdiCloudSync from '~icons/mdi/cloud-sync';
	import MdiCloudOffOutline from '~icons/mdi/cloud-off-outline';
	import MdiCheckCircle from '~icons/mdi/check-circle';
	import MdiAlertCircle from '~icons/mdi/alert-circle';
	import MdiWeatherNight from '~icons/mdi/weather-night';
	import MdiWhiteBalanceSunny from '~icons/mdi/white-balance-sunny';
	import MdiShieldCheck from '~icons/mdi/shield-check';
	import MdiBookOffOutline from '~icons/mdi/book-off-outline';
	import MdiEyeOff from '~icons/mdi/eye-off';
	import MdiBug from '~icons/mdi/bug';
	import MdiPalette from '~icons/mdi/palette';
	import MdiGamepadVariant from '~icons/mdi/gamepad-variant';
	import MdiTuneVertical from '~icons/mdi/tune-vertical';
	import MdiContentSave from '~icons/mdi/content-save';
	import MdiAccountOutline from '~icons/mdi/account-outline';
	import { Button } from '$lib/components/ui/button';
	import { ToggleGroup, ToggleGroupItem } from '$lib/components/ui/toggle-group';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		settingsStore,
		settingsSyncStatus,
		patchSettings,
		saveSettings
	} from '$lib/settings';

	type BooleanSettingKey = 'no_nsfw' | 'no_tutorials' | 'show_hidden' | 'show_debug';

	interface SettingDef {
		key: BooleanSettingKey;
		label: string;
		description: string;
		section: 'gameplay' | 'advanced';
		icon: Component;
	}

	const definitions: SettingDef[] = [
		{
			key: 'no_nsfw',
			label: 'Family-friendly only',
			description: 'Hide NSFW categories and questions in Never Have I Ever.',
			section: 'gameplay',
			icon: MdiShieldCheck
		},
		{
			key: 'no_tutorials',
			label: 'Skip tutorials',
			description: 'Do not show in-game tips and onboarding popups.',
			section: 'gameplay',
			icon: MdiBookOffOutline
		},
		{
			key: 'show_hidden',
			label: 'Show hidden content',
			description: 'Include hidden category decks when hosting NHIE.',
			section: 'advanced',
			icon: MdiEyeOff
		},
		{
			key: 'show_debug',
			label: 'Debug panel',
			description: 'Show connection and state debug info during games.',
			section: 'advanced',
			icon: MdiBug
		}
	];

	const sections = [
		{ id: 'gameplay' as const, label: 'Gameplay', icon: MdiGamepadVariant },
		{ id: 'advanced' as const, label: 'Advanced', icon: MdiTuneVertical }
	];

	interface Props {
		showAccountBanner?: boolean;
	}

	let { showAccountBanner = true }: Props = $props();

	const user = $derived((page.data as { user?: { nickname: string; email: string } | null }).user ?? null);
	const syncStatus = $derived($settingsSyncStatus);

	const syncLabel = $derived.by(() => {
		if (!user) return 'Saved on this device only';
		switch (syncStatus) {
			case 'syncing':
				return 'Syncing to your account…';
			case 'synced':
				return 'Synced to your account';
			case 'error':
				return 'Could not sync — try again';
			default:
				return 'Changes sync to your account';
		}
	});

	const syncBadgeVariant = $derived.by(() => {
		if (!user) return 'outline' as const;
		if (syncStatus === 'error') return 'destructive' as const;
		if (syncStatus === 'synced') return 'secondary' as const;
		return 'outline' as const;
	});

	const userInitial = $derived(user?.nickname?.charAt(0).toUpperCase() ?? '?');

	async function retrySync() {
		await saveSettings();
	}
</script>

{#if showAccountBanner}
	<div
		class="ring-foreground/10 bg-card mb-6 overflow-hidden rounded-xl ring-1 {user && syncStatus === 'error'
			? 'ring-destructive/30'
			: ''}"
	>
		<div class="flex items-start gap-3 p-4">
			<span
				class="bg-primary/10 text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
			>
				{#if user}
					{userInitial}
				{:else}
					<MdiAccountOutline class="size-5" />
				{/if}
			</span>

			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-2">
					<p class="text-sm font-semibold">{user ? user.nickname : 'Playing as a guest'}</p>
					<Badge variant={syncBadgeVariant} class="gap-1">
						{#if user}
							{#if syncStatus === 'synced'}
								<MdiCheckCircle />
							{:else if syncStatus === 'error'}
								<MdiAlertCircle />
							{:else}
								<MdiCloudSync class={syncStatus === 'syncing' ? 'animate-pulse' : ''} />
							{/if}
						{:else}
							<MdiCloudOffOutline />
						{/if}
						{syncLabel}
					</Badge>
				</div>

				{#if !user}
					<p class="text-muted-foreground mt-1.5 text-xs leading-relaxed">
						Preferences stay in this browser.
						<a href="/auth?redirect={encodeURIComponent(page.url.pathname)}" class="text-primary font-medium underline underline-offset-2">
							Sign in
						</a>
						to sync across devices.
					</p>
				{:else if syncStatus === 'error'}
					<Button variant="link" size="sm" class="mt-1 h-auto p-0 text-xs" onclick={retrySync}>
						Retry sync
					</Button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<section class="mb-6">
	<div class="mb-2.5 flex items-center gap-2">
		<MdiPalette class="text-muted-foreground size-4" />
		<h3 class="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Appearance</h3>
	</div>

	<div class="grid grid-cols-2 gap-2">
		<ToggleGroup
			type="single"
			value={$settingsStore.theme}
			onValueChange={(value) => {
				if (value === 'dark' || value === 'light') patchSettings({ theme: value });
			}}
			variant="outline"
			class="col-span-2 grid w-full grid-cols-2"
		>
			<ToggleGroupItem value="dark" class="gap-2 py-3">
				<MdiWeatherNight class="size-4" />
				Dark
			</ToggleGroupItem>
			<ToggleGroupItem value="light" class="gap-2 py-3">
				<MdiWhiteBalanceSunny class="size-4" />
				Light
			</ToggleGroupItem>
		</ToggleGroup>
	</div>
</section>

{#each sections as section (section.id)}
	{@const items = definitions.filter((d) => d.section === section.id)}
	{@const SectionIcon = section.icon}
	<section class="mb-6">
		<div class="mb-2.5 flex items-center gap-2">
			<SectionIcon class="text-muted-foreground size-4" />
			<h3 class="text-muted-foreground text-xs font-semibold uppercase tracking-widest">{section.label}</h3>
		</div>

		<div class="ring-foreground/10 bg-card overflow-hidden rounded-xl ring-1">
			{#each items as def, index (def.key)}
				{@const SettingIcon = def.icon}
				<div class="flex items-center gap-3 px-4 py-3.5">
					<span class="bg-muted text-muted-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
						<SettingIcon class="size-4" />
					</span>

					<div class="min-w-0 flex-1">
						<Label class="text-sm font-medium">
							{def.label}
						</Label>
						<p class="text-muted-foreground mt-0.5 text-xs leading-relaxed">{def.description}</p>
					</div>

					<ToggleGroup
						type="single"
						value={$settingsStore[def.key] ? 'on' : 'off'}
						onValueChange={(value) => {
							if (value === 'on' || value === 'off') {
								patchSettings({ [def.key]: value === 'on' });
							}
						}}
						variant="outline"
						size="sm"
						class="shrink-0"
						aria-label={`${def.label} toggle`}
					>
						<ToggleGroupItem value="off">Off</ToggleGroupItem>
						<ToggleGroupItem value="on">On</ToggleGroupItem>
					</ToggleGroup>
				</div>

				{#if index < items.length - 1}
					<Separator class="mx-4 w-auto" />
				{/if}
			{/each}
		</div>
	</section>
{/each}

{#if !user}
	<Button type="button" variant="outline" class="w-full gap-2" onclick={() => saveSettings()}>
		<MdiContentSave class="size-4" />
		Save on this device
	</Button>
{/if}
