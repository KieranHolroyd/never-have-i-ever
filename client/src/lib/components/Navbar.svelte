<script lang="ts">
	import { page } from '$app/state';
	import IcBaselineHouse from '~icons/ic/baseline-house';
	import IcBaselineContactEmail from '~icons/ic/baseline-contact-mail';
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';

	const user = $derived((page.data as { user?: { nickname: string } | null }).user ?? null);
</script>

<nav class="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800/60">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
		<a href="/" class="text-sm font-bold tracking-tight text-white hover:text-zinc-300 transition-colors">
			games.kieran.dev
		</a>
		<div class="flex items-center gap-1 pr-9">
			<a
				href="/"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
					{page.url.pathname === '/' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}"
			>
				<IcBaselineHouse class="h-4 w-4" />
				<span class="hidden sm:inline">Home</span>
			</a>
			<a
				href="/suggest"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
					{page.url.pathname === '/suggest' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}"
			>
				<IcBaselineContactEmail class="h-4 w-4" />
				<span class="hidden sm:inline">Contact</span>
			</a>
			<a
				href="/play/name"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
					{page.url.pathname === '/play/name' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}"
			>
				<IcRoundAccountCircle class="h-4 w-4" />
				<span class="hidden sm:inline">{user ? user.nickname : 'Profile'}</span>
			</a>
		</div>
	</div>
</nav>
