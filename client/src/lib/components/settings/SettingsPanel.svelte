<script lang="ts">
	import { page } from '$app/state';
	import MdiCloudSync from '~icons/mdi/cloud-sync';
	import MdiCloudOffOutline from '~icons/mdi/cloud-off-outline';
	import MdiCheckCircle from '~icons/mdi/check-circle';
	import MdiAlertCircle from '~icons/mdi/alert-circle';
	import MdiWeatherNight from '~icons/mdi/weather-night';
	import MdiWhiteBalanceSunny from '~icons/mdi/white-balance-sunny';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { ToggleGroup, ToggleGroupItem } from '$lib/components/ui/toggle-group';
	import {
		settingsStore,
		settingsSyncStatus,
		patchSettings,
		saveSettings
	} from '$lib/settings';
	import type { Settings } from '$lib/types';

	type BooleanSettingKey = 'no_nsfw' | 'no_tutorials' | 'show_hidden' | 'show_debug';

	interface SettingDef {
		key: BooleanSettingKey;
		label: string;
		description: string;
		section: 'gameplay' | 'advanced';
	}

	const definitions: SettingDef[] = [
		{
			key: 'no_nsfw',
			label: 'Family-friendly only',
			description: 'Hide NSFW categories and questions in Never Have I Ever.',
			section: 'gameplay'
		},
		{
			key: 'no_tutorials',
			label: 'Skip tutorials',
			description: 'Do not show in-game tips and onboarding popups.',
			section: 'gameplay'
		},
		{
			key: 'show_hidden',
			label: 'Show hidden content',
			description: 'Include hidden category decks when hosting NHIE.',
			section: 'advanced'
		},
		{
			key: 'show_debug',
			label: 'Debug panel',
			description: 'Show connection and state debug info during games.',
			section: 'advanced'
		}
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

	async function retrySync() {
		await saveSettings();
	}
</script>

{#if showAccountBanner}
	<Alert variant={user && syncStatus === 'error' ? 'destructive' : 'default'} class="mb-5">
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
		<AlertTitle>{user ? user.nickname : 'Playing as a guest'}</AlertTitle>
		<AlertDescription>
			{#if user}
				{syncLabel}
			{:else}
				Preferences stay in this browser.
				<a href="/auth?redirect={encodeURIComponent(page.url.pathname)}" class="font-semibold underline">
					Sign in
				</a>
				to sync across devices.
			{/if}
		</AlertDescription>
		{#if user && syncStatus === 'error'}
			<Button variant="link" size="sm" class="mt-2 h-auto p-0" onclick={retrySync}>Retry sync</Button>
		{/if}
	</Alert>
{/if}

<div class="mb-5 space-y-2">
	<Label>Theme</Label>
	<ToggleGroup
		type="single"
		value={$settingsStore.theme}
		onValueChange={(value) => {
			if (value === 'dark' || value === 'light') patchSettings({ theme: value });
		}}
		class="grid w-full grid-cols-2"
	>
		<ToggleGroupItem value="dark" class="gap-2">
			<MdiWeatherNight />
			Dark
		</ToggleGroupItem>
		<ToggleGroupItem value="light" class="gap-2">
			<MdiWhiteBalanceSunny />
			Light
		</ToggleGroupItem>
	</ToggleGroup>
</div>

{#each ['gameplay', 'advanced'] as section (section)}
	{@const items = definitions.filter((d) => d.section === section)}
	<p class="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-widest">{section}</p>
	<div class="mb-5 space-y-2">
		{#each items as def (def.key)}
			<div class="flex gap-3 rounded-xl border p-4">
				<Checkbox
					id={`setting-${def.key}`}
					class="mt-0.5 shrink-0"
					checked={$settingsStore[def.key] ?? false}
					onCheckedChange={(checked) => patchSettings({ [def.key]: checked === true })}
				/>
				<Label for={`setting-${def.key}`} class="min-w-0 cursor-pointer font-normal">
					<span class="block text-sm font-medium">{def.label}</span>
					<span class="text-muted-foreground mt-0.5 block text-xs">{def.description}</span>
				</Label>
			</div>
		{/each}
	</div>
{/each}

{#if !user}
	<Button type="button" variant="secondary" class="w-full" onclick={() => saveSettings()}>
		Save on this device
	</Button>
{/if}
