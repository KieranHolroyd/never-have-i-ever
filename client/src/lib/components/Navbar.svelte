<script lang="ts">
	import { page } from '$app/state';
	import IcBaselineHouse from '~icons/ic/baseline-house';
	import IcBaselineContactEmail from '~icons/ic/baseline-contact-mail';
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';
	import MdiViewGridOutline from '~icons/mdi/view-grid-outline';
	import MdiSettings from '~icons/mdi/settings';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		compact?: boolean;
		settingsOpen?: boolean;
	}

	let { compact = false, settingsOpen = $bindable(false) }: Props = $props();

	const user = $derived((page.data as { user?: { nickname: string } | null }).user ?? null);
	const pathname = $derived(String(page.url.pathname));

	const links = [
		{ href: '/', label: 'Home', icon: IcBaselineHouse, match: (p: string) => p === '/' },
		{ href: '/games', label: 'Games', icon: MdiViewGridOutline, match: (p: string) => p === '/games' },
		{
			href: '/suggest',
			label: 'Contact',
			icon: IcBaselineContactEmail,
			match: (p: string) => p === '/suggest'
		},
		{
			href: user ? '/profile' : '/play/name',
			label: user ? user.nickname : 'Profile',
			icon: IcRoundAccountCircle,
			match: (p: string) => p === '/profile' || p === '/play/name'
		}
	] as const;
</script>

<nav class="bg-background/95 sticky top-0 z-40 border-b backdrop-blur-md">
	<div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
		<Button href="/" variant="ghost" class="min-w-0 px-2 font-bold">
			<img src="/favicon.png" alt="" class="size-7 shrink-0" />
			<span class="truncate">games.kieran.dev</span>
		</Button>

		<div class="flex items-center gap-1">
			{#if !compact}
				{#each links as link (link.href)}
					{@const LinkIcon = link.icon}
					<Button
						href={link.href}
						variant={link.match(pathname) ? 'secondary' : 'ghost'}
						size="sm"
					>
						<LinkIcon />
						<span class="hidden sm:inline">{link.label}</span>
					</Button>
				{/each}
			{/if}

			<Button
				variant={settingsOpen ? 'secondary' : 'ghost'}
				size="icon-sm"
				data-settings-toggle
				aria-label="Settings"
				aria-expanded={settingsOpen}
				onclick={() => {
					settingsOpen = !settingsOpen;
				}}
			>
				<MdiSettings />
			</Button>
		</div>
	</div>
</nav>
