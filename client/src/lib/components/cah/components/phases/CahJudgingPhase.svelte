<script lang="ts">
	import type { CAHSubmission } from '$lib/types';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';

	interface Props {
		submissions: CAHSubmission[];
		onSelectWinner: (playerId: string) => void;
	}

	let { submissions, onSelectWinner }: Props = $props();
</script>

<div class="space-y-4">
	<div class="flex items-start justify-between gap-4">
		<div>
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-widest">Judge panel</p>
			<h3 class="text-xl font-bold">Pick the winner</h3>
			<p class="text-muted-foreground mt-1 text-sm">
				Tap the funniest anonymous submission to award the point.
			</p>
		</div>
		<Badge variant="secondary" class="text-amber-500">{submissions.length} submitted</Badge>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		{#each submissions as submission, index (submission.playerId)}
			<Card
				class="cursor-pointer transition-all hover:-translate-y-0.5 hover:border-amber-500/30"
				onclick={() => onSelectWinner(submission.playerId)}
			>
				<CardHeader>
					<Avatar size="sm">
						<AvatarFallback class="bg-amber-500/15 text-amber-300">{index + 1}</AvatarFallback>
					</Avatar>
					<Badge variant="outline">Anonymous</Badge>
					<Badge variant="secondary" class="text-amber-500">Award point →</Badge>
				</CardHeader>
				<CardContent class="space-y-2">
					{#each submission.cards as card (card.id)}
						<Card class="bg-white text-black">
							<CardContent>
								<p class="text-sm font-medium leading-relaxed">{card.text}</p>
							</CardContent>
						</Card>
					{/each}
				</CardContent>
			</Card>
		{/each}
	</div>
</div>
