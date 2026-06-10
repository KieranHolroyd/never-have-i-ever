<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import MdiAccountGroup from '~icons/mdi/account-group';
	import MdiCardsPlayingOutline from '~icons/mdi/cards-playing-outline';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import MdiPencil from '~icons/mdi/pencil';
	import MdiCheck from '~icons/mdi/check';
	import MdiLock from '~icons/mdi/lock';
	import MdiAlertCircle from '~icons/mdi/alert-circle';
	import MdiEmail from '~icons/mdi/email';
	import MdiLogout from '~icons/mdi/logout';
	import MdiTrophy from '~icons/mdi/trophy';
	import LogosGoogle from '~icons/logos/google-icon';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import { page } from '$app/state';
	import { Alert, AlertDescription, AlertTitle, AlertAction } from '$lib/components/ui/alert';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$lib/components/ui/accordion';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import {
		Empty,
		EmptyContent,
		EmptyDescription,
		EmptyHeader,
		EmptyMedia,
		EmptyTitle
	} from '$lib/components/ui/empty';
	import { Field, FieldDescription, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import {
		Item,
		ItemActions,
		ItemContent,
		ItemDescription,
		ItemGroup,
		ItemMedia,
		ItemTitle
	} from '$lib/components/ui/item';
	import {
		Table,
		TableBody,
		TableCell,
		TableRow
	} from '$lib/components/ui/table';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	const user = $derived(data.user);
	const nhieStats = $derived(data.nhieStats);
	const cahStats = $derived(data.cahStats);
	const recentNhieGames = $derived(data.recentNhieGames);
	const recentCahGames = $derived(data.recentCahGames);
	const googleAccount = $derived(data.googleAccount);
	const passwordResetSuccess = $derived(page.url.searchParams.get('reset') === 'success');

	const totalGames = $derived(nhieStats.total_games + cahStats.total_games);
	const totalWins = $derived(nhieStats.wins + cahStats.wins);
	const winRate = $derived(
		totalGames > 0
			? Math.round((totalWins / (nhieStats.games_completed + cahStats.games_completed || 1)) * 100)
			: 0
	);
	const userInitial = $derived(user.nickname.charAt(0).toUpperCase());
	const hasRecentGames = $derived(recentNhieGames.length > 0 || recentCahGames.length > 0);

	let accountPanel = $state<string>('');

	$effect(() => {
		if (form?.action === 'update_nickname' && (form.error || form.success)) accountPanel = 'nickname';
		if (form?.action === 'update_email' && (form.error || form.success)) accountPanel = 'email';
		if (form?.action === 'update_password' && (form.error || form.success)) accountPanel = 'password';
	});

	function formatDate(d: string | Date) {
		return new Date(d).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function isWinner(score: number, topScore: number) {
		return score >= topScore && topScore > 0;
	}
</script>

<svelte:head>
	<title>Profile ~ {user.nickname}</title>
</svelte:head>

<div class="space-y-8 py-10">
	{#if !user.email_verified}
		<Alert>
			<MdiAlertCircle />
			<AlertTitle>Verify your email</AlertTitle>
			<AlertDescription>
				We sent a link to {user.email}. Check your inbox.
			</AlertDescription>
			<AlertAction>
				<form method="POST" action="?/resend_verification" use:enhance>
					<Button type="submit" variant="link" size="sm">
						{form?.action === 'resend_verification' && form.success ? 'Sent!' : 'Resend'}
					</Button>
				</form>
			</AlertAction>
		</Alert>
	{/if}

	{#if passwordResetSuccess}
		<Alert>
			<MdiCheck />
			<AlertDescription>Your password has been updated.</AlertDescription>
		</Alert>
	{/if}

	<div class="flex items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<Avatar class="size-16">
				<AvatarFallback class="text-lg">{userInitial}</AvatarFallback>
			</Avatar>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">{user.nickname}</h1>
				<p class="text-muted-foreground text-sm">{user.email}</p>
			</div>
		</div>
		<form method="POST" action="/auth/logout" use:enhance>
			<Button type="submit" variant="outline" size="sm">
				<MdiLogout />
				<span class="hidden sm:inline">Sign out</span>
			</Button>
		</form>
	</div>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<Card>
			<CardContent class="pt-6 text-center">
				<p class="text-2xl font-bold">{totalGames}</p>
				<p class="text-muted-foreground mt-1 text-xs">Games played</p>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="pt-6 text-center">
				<p class="text-2xl font-bold">{totalWins}</p>
				<p class="text-muted-foreground mt-1 text-xs">Wins</p>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="pt-6 text-center">
				<p class="text-2xl font-bold">{winRate}%</p>
				<p class="text-muted-foreground mt-1 text-xs">Win rate</p>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="pt-6 text-center">
				<p class="text-2xl font-bold">{nhieStats.games_completed + cahStats.games_completed}</p>
				<p class="text-muted-foreground mt-1 text-xs">Completed</p>
			</CardContent>
		</Card>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<Card class="border-emerald-500/30">
			<CardHeader>
				<div class="flex items-center gap-3">
					<span class="bg-emerald-500/15 text-emerald-500 inline-flex size-10 items-center justify-center rounded-xl">
						<MdiAccountGroup class="size-5" />
					</span>
					<div>
						<CardTitle>Never Have I Ever</CardTitle>
						<CardDescription>Your NHIE stats</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<Table>
					<TableBody>
						<TableRow>
							<TableCell class="text-muted-foreground">Games played</TableCell>
							<TableCell class="text-right font-medium">{nhieStats.total_games}</TableCell>
						</TableRow>
						<TableRow>
							<TableCell class="text-muted-foreground">Completed</TableCell>
							<TableCell class="text-right font-medium">{nhieStats.games_completed}</TableCell>
						</TableRow>
						<TableRow>
							<TableCell class="text-muted-foreground">Wins</TableCell>
							<TableCell class="text-right font-medium">{nhieStats.wins}</TableCell>
						</TableRow>
						<TableRow>
							<TableCell class="text-muted-foreground">Total score</TableCell>
							<TableCell class="text-right font-medium">{nhieStats.total_score.toFixed(1)}</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</CardContent>
		</Card>

		<Card class="border-violet-500/30">
			<CardHeader>
				<div class="flex items-center gap-3">
					<span class="bg-violet-500/15 text-violet-500 inline-flex size-10 items-center justify-center rounded-xl">
						<MdiCardsPlayingOutline class="size-5" />
					</span>
					<div>
						<CardTitle>Cards Against Humanity</CardTitle>
						<CardDescription>Your CAH stats</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<Table>
					<TableBody>
						<TableRow>
							<TableCell class="text-muted-foreground">Games played</TableCell>
							<TableCell class="text-right font-medium">{cahStats.total_games}</TableCell>
						</TableRow>
						<TableRow>
							<TableCell class="text-muted-foreground">Completed</TableCell>
							<TableCell class="text-right font-medium">{cahStats.games_completed}</TableCell>
						</TableRow>
						<TableRow>
							<TableCell class="text-muted-foreground">Wins</TableCell>
							<TableCell class="text-right font-medium">{cahStats.wins}</TableCell>
						</TableRow>
						<TableRow>
							<TableCell class="text-muted-foreground">Rounds won</TableCell>
							<TableCell class="text-right font-medium">{cahStats.rounds_won}</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Recent games</CardTitle>
			<CardDescription>Games you've played while signed in</CardDescription>
		</CardHeader>
		<CardContent>
			{#if hasRecentGames}
				<ItemGroup>
					{#each recentNhieGames as game (game.id)}
						{@const won = isWinner(game.score, game.top_score)}
						<Item variant="outline">
							<ItemMedia variant="icon">
								{#if won}
									<MdiTrophy />
								{:else}
									<MdiAccountGroup />
								{/if}
							</ItemMedia>
							<ItemContent>
								<ItemTitle>
									Never Have I Ever
									{#if won}
										<Badge variant="secondary">Won</Badge>
									{/if}
									{#if !game.game_completed}
										<Badge variant="outline">Unfinished</Badge>
									{/if}
								</ItemTitle>
								<ItemDescription>
									{game.player_count} players · {formatDate(game.created_at)}
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<span class="text-sm font-semibold">{game.score.toFixed(1)} pts</span>
							</ItemActions>
						</Item>
					{/each}

					{#each recentCahGames as game (game.id)}
						{@const won = isWinner(game.score, game.top_score)}
						<Item variant="outline">
							<ItemMedia variant="icon">
								{#if won}
									<MdiTrophy />
								{:else}
									<MdiCardsPlayingOutline />
								{/if}
							</ItemMedia>
							<ItemContent>
								<ItemTitle>
									Cards Against Humanity
									{#if won}
										<Badge variant="secondary">Won</Badge>
									{/if}
									{#if !game.game_completed}
										<Badge variant="outline">Unfinished</Badge>
									{/if}
								</ItemTitle>
								<ItemDescription>
									{game.player_count} players · Round {game.rounds_played} · {formatDate(game.created_at)}
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<span class="text-sm font-semibold">{game.score} wins</span>
							</ItemActions>
						</Item>
					{/each}
				</ItemGroup>
			{:else}
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<MdiAccountGroup />
						</EmptyMedia>
						<EmptyTitle>No games recorded yet</EmptyTitle>
						<EmptyDescription>
							Play a game while logged in to start tracking stats.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button href="/" variant="emerald">
							Play now
							<MdiArrowRight />
						</Button>
					</EmptyContent>
				</Empty>
			{/if}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Gameplay preferences</CardTitle>
			<CardDescription>
				These settings apply in games and sync to your account on every device.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<SettingsPanel showAccountBanner={false} />
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Account</CardTitle>
			<CardDescription>Update how you sign in and manage linked providers</CardDescription>
		</CardHeader>
		<CardContent class="space-y-8">
			<section class="space-y-3">
				<div>
					<h3 class="text-sm font-medium">Sign-in details</h3>
					<p class="text-muted-foreground text-sm">Tap a row to update your credentials</p>
				</div>

				<div class="ring-foreground/10 bg-card overflow-hidden rounded-xl ring-1">
					<Accordion type="single" bind:value={accountPanel}>
						<AccordionItem value="nickname" class="border-b px-4 last:border-b-0">
							<AccordionTrigger class="py-4 hover:no-underline">
								<div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
									<span class="bg-muted text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg">
										<MdiPencil class="size-4" />
									</span>
									<div class="min-w-0 text-left">
										<p class="text-sm font-medium">Username</p>
										<p class="text-muted-foreground truncate text-xs">{user.nickname}</p>
									</div>
								</div>
							</AccordionTrigger>
							<AccordionContent class="pb-4">
								<form
									method="POST"
									action="?/update_nickname"
									use:enhance={() => ({ update }) => update({ reset: false })}
									class="bg-muted/40 space-y-4 rounded-lg border p-4"
								>
									{#if form?.action === 'update_nickname' && form.error}
										<Alert variant="destructive">
											<AlertDescription>{form.error}</AlertDescription>
										</Alert>
									{/if}
									{#if form?.action === 'update_nickname' && form.success}
										<Alert>
											<MdiCheck />
											<AlertDescription>Username updated.</AlertDescription>
										</Alert>
									{/if}
									<FieldGroup>
										<Field>
											<FieldLabel for="nickname">New username</FieldLabel>
											<FieldDescription>Shown in games and on your profile.</FieldDescription>
											<Input
												id="nickname"
												name="nickname"
												type="text"
												value={user.nickname}
												maxlength={30}
												required
											/>
										</Field>
									</FieldGroup>
									<div class="flex justify-end">
										<Button type="submit" size="sm">Save changes</Button>
									</div>
								</form>
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="email" class="border-b px-4 last:border-b-0">
							<AccordionTrigger class="py-4 hover:no-underline">
								<div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
									<span class="bg-muted text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg">
										<MdiEmail class="size-4" />
									</span>
									<div class="min-w-0 text-left">
										<p class="text-sm font-medium">Email</p>
										<p class="text-muted-foreground truncate text-xs">{user.email}</p>
									</div>
								</div>
							</AccordionTrigger>
							<AccordionContent class="pb-4">
								<form
									method="POST"
									action="?/update_email"
									use:enhance={() => ({ update }) => update({ reset: false })}
									class="bg-muted/40 space-y-4 rounded-lg border p-4"
								>
									{#if form?.action === 'update_email' && form.error}
										<Alert variant="destructive">
											<AlertDescription>{form.error}</AlertDescription>
										</Alert>
									{/if}
									{#if form?.action === 'update_email' && form.success}
										<Alert>
											<MdiCheck />
											<AlertDescription>Email updated.</AlertDescription>
										</Alert>
									{/if}
									<FieldGroup>
										<Field>
											<FieldLabel for="email">New email</FieldLabel>
											<Input id="email" name="email" type="email" value={user.email} required />
										</Field>
										<Field>
											<FieldLabel for="email-password">Current password</FieldLabel>
											<FieldDescription>Required to confirm this change.</FieldDescription>
											<Input
												id="email-password"
												name="password"
												type="password"
												placeholder="Enter your current password"
												required
											/>
										</Field>
									</FieldGroup>
									<div class="flex justify-end">
										<Button type="submit" size="sm">Save changes</Button>
									</div>
								</form>
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="password" class="px-4">
							<AccordionTrigger class="py-4 hover:no-underline">
								<div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
									<span class="bg-muted text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg">
										<MdiLock class="size-4" />
									</span>
									<div class="min-w-0 text-left">
										<p class="text-sm font-medium">Password</p>
										<p class="text-muted-foreground text-xs">Last changed · hidden</p>
									</div>
								</div>
							</AccordionTrigger>
							<AccordionContent class="pb-4">
								<form
									method="POST"
									action="?/update_password"
									use:enhance={() => ({ update }) => update({ reset: false })}
									class="bg-muted/40 space-y-4 rounded-lg border p-4"
								>
									{#if form?.action === 'update_password' && form.error}
										<Alert variant="destructive">
											<AlertDescription>{form.error}</AlertDescription>
										</Alert>
									{/if}
									{#if form?.action === 'update_password' && form.success}
										<Alert>
											<MdiCheck />
											<AlertDescription>Password updated.</AlertDescription>
										</Alert>
									{/if}
									<FieldGroup>
										<Field>
											<FieldLabel for="current_password">Current password</FieldLabel>
											<Input id="current_password" name="current_password" type="password" required />
										</Field>
										<Field>
											<FieldLabel for="new_password">New password</FieldLabel>
											<FieldDescription>At least 8 characters.</FieldDescription>
											<Input id="new_password" name="new_password" type="password" minlength={8} required />
										</Field>
										<Field>
											<FieldLabel for="confirm_password">Confirm new password</FieldLabel>
											<Input
												id="confirm_password"
												name="confirm_password"
												type="password"
												minlength={8}
												required
											/>
										</Field>
									</FieldGroup>
									<div class="flex justify-end">
										<Button type="submit" size="sm">Save changes</Button>
									</div>
								</form>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
			</section>

			<section class="space-y-3">
				<div>
					<h3 class="text-sm font-medium">Connected accounts</h3>
					<p class="text-muted-foreground text-sm">Sign in faster with a linked provider</p>
				</div>

				<ItemGroup class="ring-foreground/10 overflow-hidden rounded-xl ring-1">
					<Item variant="outline" class="rounded-none border-0 px-4 py-4">
						<ItemMedia variant="icon">
							<span class="bg-muted inline-flex size-9 items-center justify-center rounded-lg">
								<LogosGoogle class="size-4" />
							</span>
						</ItemMedia>
						<ItemContent>
							<ItemTitle>
								Google
								{#if googleAccount}
									<Badge variant="secondary">Connected</Badge>
								{:else}
									<Badge variant="outline">Not connected</Badge>
								{/if}
							</ItemTitle>
							<ItemDescription>
								{googleAccount ? googleAccount.email : 'Link your Google account for one-click sign in'}
							</ItemDescription>
						</ItemContent>
						<ItemActions>
							{#if googleAccount}
								<form method="POST" action="?/unlink_google" use:enhance={() => ({ update }) => update({ reset: false })}>
									<Button type="submit" variant="outline" size="sm">Unlink</Button>
								</form>
							{:else}
								<Button href="/auth/google?link=1" size="sm">Connect</Button>
							{/if}
						</ItemActions>
					</Item>
				</ItemGroup>

				{#if form?.action === 'unlink_google' && form.success}
					<Alert>
						<MdiCheck />
						<AlertDescription>Google account unlinked.</AlertDescription>
					</Alert>
				{/if}
			</section>
		</CardContent>
	</Card>
</div>
