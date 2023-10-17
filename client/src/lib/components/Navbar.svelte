<script lang="ts">
	import MdiClose from '~icons/mdi/close';
	import BaselineMenu from '~icons/ic/baseline-menu';
	import IcBaselineHouse from '~icons/ic/baseline-house';
	import IcBaselineContactEmail from '~icons/ic/baseline-contact-mail';
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';

	import { browser } from '$app/environment';
	import Notification from './Notification.svelte';
	import { settingsStore } from '$lib/settings';
	import clickOutside from '$lib/clickOutside';

	let show = false;

	let settings = settingsStore;
	let error: string | null = null;

	function save_settings() {
		try {
			if (browser) {
				localStorage.setItem('settings', JSON.stringify($settings));
			}
		} catch (e) {
			error = e as any;
		}
	}
</script>

<div
	use:clickOutside={() => {
		show = false;
	}}
>
	<div class="fixed z-40 top-2 left-2">
		<button
			class="relative rounded-full p-2 bg-slate-200 dark:bg-slate-500 backdrop-blur-sm bg-opacity-25 border-2 duration-200 {show
				? 'transform rotate-90'
				: 'transform'}"
			on:click={() => (show = !show)}
		>
			{#if show}
				<MdiClose class="dark:text-white h-8 w-8" />
			{:else}
				<BaselineMenu class="dark:text-white h-8 w-8" />
			{/if}
		</button>
	</div>
	<div
		class="{show
			? 'pointer-events-auto opacity-100'
			: 'pointer-events-none opacity-0 -translate-x-4'} duration-200 prose prose-invert z-30 fixed top-0 left-0 py-2 min-w-full md:min-w-[24rem] bg-slate-200/75 dark:bg-slate-800/75 backdrop-blur-sm border-2 rounded-lg"
	>
		<h1 class="ml-16 pl-2">Menu</h1>

		<a href="/" class="no-underline">
			<div class="relative font-bold w-full pl-12 pr-3 py-2 hover:bg-slate-400/60">
				<IcBaselineHouse class="absolute left-3 top-2.5 dark:text-white h-6 w-6" /> Home
			</div>
		</a>
		<a href="/suggest" class="no-underline">
			<div class="relative font-bold w-full pl-12 pr-3 py-2 hover:bg-slate-400/60">
				<IcBaselineContactEmail class="absolute left-3 top-2.5 dark:text-white h-6 w-6" /> Contact
			</div>
		</a>
		<a href="/play/name" class="no-underline">
			<div class="relative font-bold w-full pl-12 pr-3 py-2 hover:bg-slate-400/60">
				<IcRoundAccountCircle class="absolute left-3 top-2.5 dark:text-white h-6 w-6" /> Change username
			</div>
		</a>
	</div>
</div>
<Notification
	show={error !== null}
	on:closeNotification={() => {
		error = null;
	}}
>
	{error ?? 'Unknown Error (See Javascript Console)'}
</Notification>
