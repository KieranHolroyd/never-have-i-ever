<script lang="ts">
	import { page } from '$app/stores';
	import NeverHaveIEver from '$lib/components/Game.svelte';
</script>

<NeverHaveIEver id={$page.params.gameid} />
