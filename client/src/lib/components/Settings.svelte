<script lang="ts">
	import clickOutside from '$lib/clickOutside';
	import MdiSave from '~icons/mdi/content-save';
	import { browser } from '$app/environment';
	import { toast } from '$lib/toast';
	import { settingsStore } from '$lib/settings';

	interface Props {
		show?: boolean;
		embedded?: boolean;
	}

	let { show = $bindable(false), embedded = false }: Props = $props();

	let settings = settingsStore;

	function save_settings() {
		try {
			if (browser) {
				localStorage.setItem('settings', JSON.stringify($settings));
				toast.success('Settings saved');
			}
		} catch (e) {
			toast.error(String(e ?? 'Failed to save settings'));
		}
	}
</script>

{#if !embedded}
	<div class="fixed right-2 top-2 z-50">
		<button
			type="button"
			class="rounded-lg p-2 text-white/45 hover:bg-white/5 hover:text-white"
			onclick={() => (show = !show)}
			aria-label="Settings"
		>
			Settings
		</button>
	</div>
{/if}

<div use:clickOutside={() => (show = false)}>
	<div
		class="{show
			? 'pointer-events-auto translate-x-0 opacity-100'
			: 'pointer-events-none translate-x-4 opacity-0'} fixed right-0 top-0 z-50 min-h-screen w-full border-l border-white/8 bg-zinc-950/98 p-5 shadow-2xl backdrop-blur-md transition duration-200 md:w-80"
	>
		<p class="site-phase-label mb-1">Preferences</p>
		<h2 class="mb-5 text-xl font-black text-white">Settings</h2>

		<div class="space-y-2">
			<label
				class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/8 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-white/80"
			>
				<span>No NSFW questions</span>
				<input
					type="checkbox"
					class="h-4 w-4 accent-emerald-500"
					checked={$settings.no_nsfw ?? false}
					onchange={(e) => {
						$settings = { ...$settings, no_nsfw: e.currentTarget.checked };
					}}
				/>
			</label>
			<label
				class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/8 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-white/80"
			>
				<span>No tutorials</span>
				<input
					type="checkbox"
					class="h-4 w-4 accent-emerald-500"
					checked={$settings.no_tutorials ?? false}
					onchange={(e) => {
						$settings = { ...$settings, no_tutorials: e.currentTarget.checked };
					}}
				/>
			</label>
			<label
				class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/8 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-white/80"
			>
				<span>Show hidden questions</span>
				<input
					type="checkbox"
					class="h-4 w-4 accent-emerald-500"
					checked={$settings.show_hidden ?? false}
					onchange={(e) => {
						$settings = { ...$settings, show_hidden: e.currentTarget.checked };
					}}
				/>
			</label>
			<label
				class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/8 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-white/80"
			>
				<span>Show debug info</span>
				<input
					type="checkbox"
					class="h-4 w-4 accent-emerald-500"
					checked={$settings.show_debug ?? false}
					onchange={(e) => {
						$settings = { ...$settings, show_debug: e.currentTarget.checked };
					}}
				/>
			</label>
		</div>

		<button type="button" class="site-btn-primary mt-6 w-full" onclick={save_settings}>
			<MdiSave class="mr-2 inline h-4 w-4" />
			Save
		</button>
	</div>
</div>
