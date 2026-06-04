<script lang="ts">
	import { page } from '$app/state';
	import MdiCloudSync from '~icons/mdi/cloud-sync';
	import MdiCloudOffOutline from '~icons/mdi/cloud-off-outline';
	import MdiCheckCircle from '~icons/mdi/check-circle';
	import MdiAlertCircle from '~icons/mdi/alert-circle';
	import SiteButton from '$lib/components/ui/SiteButton.svelte';
	import {
		settingsStore,
		settingsSyncStatus,
		patchSettings,
		saveSettings
	} from '$lib/settings';
	import type { Settings } from '$lib/types';

	interface SettingDef {
		key: keyof Settings;
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
		/** Hide the account sync banner (e.g. when embedded in profile). */
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
	<div
		class="mb-5 rounded-xl border px-4 py-3 text-sm {user
			? syncStatus === 'error'
				? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
				: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100/90'
			: 'border-white/10 bg-white/[0.03] text-white/55'}"
	>
		<div class="flex items-start gap-3">
			{#if user}
				{#if syncStatus === 'synced'}
					<MdiCheckCircle class="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
				{:else if syncStatus === 'error'}
					<MdiAlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
				{:else}
					<MdiCloudSync class="mt-0.5 h-5 w-5 shrink-0 text-emerald-400 {syncStatus === 'syncing'
						? 'animate-pulse'
						: ''}" />
				{/if}
			{:else}
				<MdiCloudOffOutline class="mt-0.5 h-5 w-5 shrink-0 text-white/35" />
			{/if}
			<div class="min-w-0 flex-1">
				{#if user}
					<p class="font-bold text-white">{user.nickname}</p>
					<p class="mt-0.5 text-xs leading-relaxed opacity-90">{syncLabel}</p>
				{:else}
					<p class="font-bold text-white/80">Playing as a guest</p>
					<p class="mt-0.5 text-xs leading-relaxed">
						Preferences stay in this browser.
						<a href="/auth?redirect={encodeURIComponent(page.url.pathname)}" class="font-semibold text-emerald-300 hover:text-emerald-200">Sign in</a>
						to sync across devices.
					</p>
				{/if}
			</div>
		</div>
		{#if user && syncStatus === 'error'}
			<button
				type="button"
				class="mt-3 text-xs font-bold text-rose-200 underline hover:text-white"
				onclick={retrySync}
			>
				Retry sync
			</button>
		{/if}
	</div>
{/if}

{#each ['gameplay', 'advanced'] as section (section)}
	{@const items = definitions.filter((d) => d.section === section)}
	<p class="site-phase-label mb-2 capitalize">{section}</p>
	<div class="mb-5 space-y-2">
		{#each items as def (def.key)}
			<label
				class="flex cursor-pointer gap-3 rounded-xl border border-white/8 bg-zinc-900/60 px-4 py-3 transition hover:border-white/12"
			>
				<input
					type="checkbox"
					class="mt-1 h-4 w-4 shrink-0 accent-emerald-500"
					checked={$settingsStore[def.key] ?? false}
					onchange={(e) => patchSettings({ [def.key]: e.currentTarget.checked })}
				/>
				<span class="min-w-0">
					<span class="block text-sm font-bold text-white">{def.label}</span>
					<span class="mt-0.5 block text-xs leading-relaxed text-white/45">{def.description}</span>
				</span>
			</label>
		{/each}
	</div>
{/each}

{#if !user}
	<SiteButton type="button" variant="secondary" fullWidth onclick={() => saveSettings()}>
		Save on this device
	</SiteButton>
{/if}
