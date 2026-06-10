<script lang="ts">
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { ActionData, PageData } from './$types';
	import { LocalPlayer } from '$lib/player';
	import { enhance } from '$app/forms';
	import { safeCapture, safeIdentify } from '$lib/analytics';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	type AccountUser = {
		nickname: string;
		email: string;
	};

	let { data, form }: Props = $props();

	const user = $derived((data.user as AccountUser | null | undefined) ?? null);

	$effect(() => {
		if (user && !LocalPlayer.name) {
			LocalPlayer.name = user.nickname;
		}
	});

	let nickname: string = $state('');

	$effect(() => {
		nickname = user?.nickname ?? LocalPlayer.name ?? '';
	});
	let error: string = $state('');

	const redirect_url = $derived(page.url.searchParams.get('redirect'));

	const destinationLabel = $derived.by(() => {
		if (!redirect_url) return null;
		if (redirect_url.includes('never-have-i-ever')) return 'Never Have I Ever';
		if (redirect_url.includes('cards-against-humanity')) return 'Cards Against Humanity';
		return 'game room';
	});

	function choose_nickname() {
		if (nickname === '') {
			return (error = 'You need to choose a nickname!');
		}
		const isNew = LocalPlayer.name === null;
		LocalPlayer.name = nickname;

		if (redirect_url !== null) {
			void goto(redirect_url);
		} else {
			void goto('/play/name');
		}

		safeIdentify(LocalPlayer.id, { nickname });
		safeCapture('nickname_set', { is_new: isNew });
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center px-4 py-12">
	<div class="w-full max-w-sm space-y-6">
		<div class="text-center">
			<div class="bg-muted mb-4 inline-flex size-14 items-center justify-center rounded-2xl">
				<IcRoundAccountCircle class="text-primary size-8" />
			</div>
			{#if destinationLabel}
				<Badge variant="outline" class="mb-3">Joining {destinationLabel}</Badge>
			{/if}
			<h1 class="text-2xl font-bold">
				{user ? `Hey, ${user.nickname}` : (LocalPlayer.name !== null ? `Hey, ${LocalPlayer.name}` : 'Choose a nickname')}
			</h1>
			<p class="text-muted-foreground mt-2 text-sm">
				{user
					? 'Your nickname is saved to your account.'
					: LocalPlayer.name === null
						? 'This is how other players will see you in the room.'
						: 'Update your nickname before you continue.'}
			</p>
		</div>

		{#if user}
			<Card>
				<CardContent class="pt-6">
					<form
						method="POST"
						action="?/updateNickname"
						use:enhance={() => {
							return ({ result }) => {
								if (result.type === 'success' && redirect_url) goto(redirect_url);
							};
						}}
						class="space-y-4"
					>
						<div class="space-y-2">
							<Label for="name">Nickname</Label>
							<Input
								type="text"
								id="name"
								name="nickname"
								placeholder="e.g. P. Flynn"
								bind:value={nickname}
								maxlength={30}
							/>
						</div>
						{#if form?.error}
							<p class="text-destructive text-xs">{form.error}</p>
						{/if}
						<Button type="submit" variant="emerald" class="w-full">
							{redirect_url ? 'Continue to room' : 'Update nickname'}
							{#if redirect_url}
								<MdiArrowRight />
							{/if}
						</Button>
					</form>
				</CardContent>
				<CardFooter class="justify-between border-t">
					<span class="text-muted-foreground text-xs">{user.email}</span>
					<form method="POST" action="/auth/logout">
						<Button type="submit" variant="ghost" size="sm">Sign out</Button>
					</form>
				</CardFooter>
			</Card>
		{:else}
			<Card>
				<CardHeader class="pb-2">
					<CardTitle class="text-base">Your display name</CardTitle>
					<CardDescription>Visible to everyone in the room.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-2">
						<Label for="name">Nickname</Label>
						<Input
							type="text"
							id="name"
							name="name"
							placeholder="e.g. P. Flynn"
							bind:value={nickname}
							onkeydown={(e) => (e.key === 'Enter' ? choose_nickname() : null)}
						/>
					</div>
					{#if error !== ''}
						<p class="text-destructive text-xs">{error}</p>
					{/if}
					<Button type="button" variant="emerald" class="w-full" onclick={choose_nickname}>
						{redirect_url ? 'Continue to room' : LocalPlayer.name === null ? 'Set nickname' : 'Update nickname'}
						{#if redirect_url}
							<MdiArrowRight />
						{/if}
					</Button>
				</CardContent>
			</Card>

			<p class="text-muted-foreground text-center text-sm">
				or
				<Button
					href="/auth{redirect_url ? `?redirect=${encodeURIComponent(redirect_url)}` : ''}"
					variant="link"
					size="sm"
					class="h-auto p-0"
				>
					sign in / create account
				</Button>
				to save your nickname
			</p>
		{/if}
	</div>
</div>
