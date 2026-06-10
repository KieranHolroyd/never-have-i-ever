<script lang="ts">
	import type { CAHSubmission } from '$lib/types';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';

	interface Props {
		submissions: CAHSubmission[];
	}

	let { submissions }: Props = $props();
</script>

<div class="space-y-4">
	<Card class="border-amber-500/30 bg-amber-500/5 text-center">
		<CardHeader>
			<CardDescription class="text-amber-500">Judging</CardDescription>
			<CardTitle>Judge is deciding</CardTitle>
		</CardHeader>
		<CardContent>
			<CardDescription>
				All {submissions.length} submission{submissions.length === 1 ? '' : 's'} are in — waiting for
				the judge's pick.
			</CardDescription>
		</CardContent>
	</Card>

	<div class="grid gap-3 sm:grid-cols-2">
		{#each submissions as submission, index (index)}
			<Card>
				<CardHeader>
					<Avatar size="sm">
						<AvatarFallback>{index + 1}</AvatarFallback>
					</Avatar>
					<Badge variant="outline">Anonymous</Badge>
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
