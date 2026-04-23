<script lang="ts">
	import clickOutside from '$lib/clickOutside';
	import MdiSettings from '~icons/mdi/settings';
	import MdiClose from '~icons/mdi/close';
	import MdiSave from '~icons/mdi/content-save';

	import { browser } from '$app/environment';
	import { toast } from '$lib/toast';
	import { settingsStore } from '$lib/settings';

	let show = $state(false);

	let settings = settingsStore;
	let error: string | null = $state(null);

	function save_settings() {
		try {
			if (browser) {
				localStorage.setItem('settings', JSON.stringify($settings));
				toast.success('Settings saved');
			}
		} catch (e) {
			error = String(e ?? 'Failed to save settings');
			toast.error(error);
		}
	}
</script>

<div use:clickOutside={() => (show = false)}>
	<!-- Trigger: sits in top-right corner, visually integrated with the horizontal navbar -->
	<div class="fixed z-50 top-2 right-2">
		<button
			class="rounded-md p-1.5 transition-colors {show
				? 'bg-zinc-800 text-white'
				: 'text-zinc-400 hover:text-white hover:bg-zinc-800'}"
			onclick={() => (show = !show)}
			aria-label="Settings"
		>
			{#if show}
				<MdiClose class="h-5 w-5" />
			{:else}
				<MdiSettings class="h-5 w-5" />
			{/if}
		</button>
	</div>

	<!-- Right-side slide-in panel -->
	<div
		class="{show
			? 'pointer-events-auto opacity-100 translate-x-0'
			: 'pointer-events-none opacity-0 translate-x-4'} transition duration-200 prose dark:prose-invert z-40 fixed top-0 right-0 py-5 px-5 w-full md:w-80 min-h-screen bg-zinc-900/95 text-zinc-100 backdrop-blur-md border-l border-zinc-700/60 shadow-2xl"
	>
		<h1 class="mt-2 mb-4 text-xl">Settings</h1>
		<label class="my-[2px] block">
			<div
				class="py-2 px-4 w-full text-left text-base capitalize font-semibold rounded-md border border-zinc-700/50 bg-zinc-800/60 hover:bg-zinc-800 transition"
			>
				<input
					type="checkbox"
					class=""
					onchange={(e) => {
						$settings = { ...$settings, no_nsfw: e?.currentTarget?.checked };
					}}
					checked={$settings.no_nsfw ?? false}
				/>
				<span class="float-right"> No NSFW Questions </span>
			</div>
			<label class="my-[2px] block">
				<div
					class="py-2 px-4 w-full text-left text-base capitalize font-semibold rounded-md border border-zinc-700/50 bg-zinc-800/60 hover:bg-zinc-800 transition"
				>
					<input
						type="checkbox"
						class=""
						onchange={(e) => {
							$settings = { ...$settings, no_tutorials: e?.currentTarget?.checked };
						}}
						checked={$settings.no_tutorials ?? false}
					/>
					<span class="float-right"> No Tutorials </span>
				</div>
			</label>
			<label class="my-[2px] block">
				<div
					class="py-2 px-4 w-full text-left text-base capitalize font-semibold rounded-md border border-zinc-700/50 bg-zinc-800/60 hover:bg-zinc-800 transition"
				>
					<input
						type="checkbox"
						class=""
						onchange={(e) => {
							$settings = { ...$settings, show_hidden: e?.currentTarget?.checked };
						}}
						checked={$settings.show_hidden ?? false}
					/>
					<span class="float-right"> Show Hidden Questions </span>
				</div>
			</label>
			<label class="my-[2px] block">
				<div
					class="py-2 px-4 w-full text-left text-base capitalize font-semibold rounded-md border border-zinc-700/50 bg-zinc-800/60 hover:bg-zinc-800 transition"
				>
					<input
						type="checkbox"
						class=""
						onchange={(e) => {
							$settings = { ...$settings, show_debug: e?.currentTarget?.checked };
						}}
						checked={$settings.show_debug ?? false}
					/>
					<span class="float-right"> Show Debug Info </span>
				</div>
			</label>
			<button
				class="mt-4 w-full inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-white font-semibold shadow hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
				onclick={save_settings}
			>
				<MdiSave class="inline-block mr-2" /> Save
			</button>
		</label>
	</div>
</div>
