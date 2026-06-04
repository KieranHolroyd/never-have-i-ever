<script lang="ts">
	import { page } from '$app/state';
	import IcBaselineHouse from '~icons/ic/baseline-house';
	import IcBaselineContactEmail from '~icons/ic/baseline-contact-mail';
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';
	import MdiViewGridOutline from '~icons/mdi/view-grid-outline';
	import MdiSettings from '~icons/mdi/settings';
	import MdiClose from '~icons/mdi/close';

	interface Props {
		compact?: boolean;
		settingsOpen?: boolean;
	}

	let { compact = false, settingsOpen = $bindable(false) }: Props = $props();

	const user = $derived((page.data as { user?: { nickname: string } | null }).user ?? null);
	const pathname = $derived(String(page.url.pathname));

	function navLinkClass(active: boolean) {
		return active
			? 'bg-white/[0.08] text-white ring-1 ring-emerald-500/20'
			: 'text-white/45 hover:bg-white/[0.05] hover:text-white';
	}
</script>

<nav class="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/92 backdrop-blur-md">
	<div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
		<a
			href="/"
			class="flex min-w-0 items-center gap-2.5 font-black tracking-tight text-white transition hover:text-emerald-300"
		>
			<img src="/favicon.png" alt="" class="h-7 w-7 shrink-0" />
			<span class="truncate text-sm sm:text-base">games.kieran.dev</span>
		</a>

		<div class="flex items-center gap-1">
			{#if !compact}
				<a
					href="/"
					class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition {navLinkClass(
						pathname === '/'
					)}"
				>
					<IcBaselineHouse class="h-4 w-4" />
					<span class="hidden sm:inline">Home</span>
				</a>
				<a
					href="/games"
					class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition {navLinkClass(
						pathname === '/games'
					)}"
				>
					<MdiViewGridOutline class="h-4 w-4" />
					<span class="hidden sm:inline">Games</span>
				</a>
				<a
					href="/suggest"
					class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition {navLinkClass(
						pathname === '/suggest'
					)}"
				>
					<IcBaselineContactEmail class="h-4 w-4" />
					<span class="hidden sm:inline">Contact</span>
				</a>
				<a
					href={user ? '/profile' : '/play/name'}
					class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition {navLinkClass(
						pathname === '/profile' || pathname === '/play/name'
					)}"
				>
					<IcRoundAccountCircle class="h-4 w-4" />
					<span class="hidden sm:inline">{user ? user.nickname : 'Profile'}</span>
				</a>
			{/if}

			<button
				type="button"
				class="ml-1 rounded-lg p-2 transition {settingsOpen
					? 'bg-emerald-500/15 text-emerald-300'
					: 'text-white/45 hover:bg-white/[0.05] hover:text-white'}"
				aria-label="Settings"
				aria-expanded={settingsOpen}
				onclick={() => (settingsOpen = !settingsOpen)}
			>
				{#if settingsOpen}
					<MdiClose class="h-5 w-5" />
				{:else}
					<MdiSettings class="h-5 w-5" />
				{/if}
			</button>
		</div>
	</div>
</nav>
