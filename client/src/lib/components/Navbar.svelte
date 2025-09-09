<script lang="ts">
	import MdiClose from '~icons/mdi/close';
	import BaselineMenu from '~icons/ic/baseline-menu';
	import IcBaselineHouse from '~icons/ic/baseline-house';
	import IcBaselineContactEmail from '~icons/ic/baseline-contact-mail';
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';
	import MdiInformationOutline from '~icons/mdi/information-outline';

	import clickOutside from '$lib/clickOutside';
	import { version } from '$lib/version';

	let show = $state(false);
</script>

<div
	use:clickOutside={() => {
		show = false;
	}}
>
	<div class="fixed z-40 top-2 left-2">
		<button
			class="relative rounded-full p-2 bg-slate-700/40 text-slate-100 backdrop-blur-sm border border-slate-500/50 shadow hover:bg-slate-600/50 transition {show
				? 'transform rotate-90'
				: 'transform'}"
			onclick={() => (show = !show)}
		>
			{#if show}
				<MdiClose class="h-7 w-7" />
			{:else}
				<BaselineMenu class="h-7 w-7" />
			{/if}
		</button>
	</div>
	<div
		class="{show
			? 'pointer-events-auto opacity-100 translate-x-0'
			: 'pointer-events-none opacity-0 -translate-x-4'} transition duration-200 prose dark:prose-invert z-30 fixed top-0 left-0 py-3 min-w-full md:min-w-[24rem] bg-slate-800/75 text-slate-100 backdrop-blur-md border border-slate-600/60 rounded-lg shadow-xl"
	>
		<h1 class="ml-16 pl-2">Menu</h1>

		<a href="/" class="no-underline">
			<div class="relative font-bold w-full pl-12 pr-3 py-2 hover:bg-slate-700/40">
				<IcBaselineHouse class="absolute left-3 top-2.5 h-6 w-6" /> Home
			</div>
		</a>
		<a href="/suggest" class="no-underline">
			<div class="relative font-bold w-full pl-12 pr-3 py-2 hover:bg-slate-700/40">
				<IcBaselineContactEmail class="absolute left-3 top-2.5 h-6 w-6" /> Contact
			</div>
		</a>
		<a href="/play/name" class="no-underline">
			<div class="relative font-bold w-full pl-12 pr-3 py-2 hover:bg-slate-700/40">
				<IcRoundAccountCircle class="absolute left-3 top-2.5 h-6 w-6" /> Change username
			</div>
		</a>
		<div
			class="relative font-bold w-full pl-12 pr-3 py-2 text-sm opacity-80 border-t border-slate-600/40 mt-2 pt-3"
		>
			<MdiInformationOutline class="absolute left-3 top-2.5 h-5 w-5" />
			<span>v{version}</span>
		</div>
	</div>
</div>
