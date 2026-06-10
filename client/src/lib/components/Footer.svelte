<script lang="ts">
	import { page } from '$app/state';
	import { version } from '$lib/version';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { ButtonGroup } from '$lib/components/ui/button-group';

	const links = [
		{ href: '/', label: 'Home', match: (pathname: string) => pathname === '/' },
		{ href: '/games', label: 'Games', match: (pathname: string) => pathname === '/games' },
		{ href: '/suggest', label: 'Contact', match: (pathname: string) => pathname === '/suggest' }
	] as const;

	const pathname = $derived(String(page.url.pathname));
</script>

<footer class="mt-auto pt-16 pb-10">
	<Card size="sm">
		<CardContent class="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
			<span class="text-sm font-medium text-foreground">Party games for everyone</span>

			<Separator orientation="vertical" class="hidden h-4 sm:block" />

			<ButtonGroup>
				{#each links as link (link.href)}
					<Button
						variant={link.match(pathname) ? 'secondary' : 'ghost'}
						size="xs"
						href={link.href}
					>
						{link.label}
					</Button>
				{/each}
			</ButtonGroup>

			<Badge variant="secondary" class="ml-auto font-mono">v{version}</Badge>
		</CardContent>
	</Card>
</footer>
