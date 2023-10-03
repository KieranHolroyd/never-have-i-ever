<script lang="ts">
	import { page } from '$app/stores';
	import NeverHaveIEver from '$lib/components/Game.svelte';

	export const csr = true;
</script>

<h1>Game {$page.params.gameid}</h1>

<NeverHaveIEver id={$page.params.gameid} />
