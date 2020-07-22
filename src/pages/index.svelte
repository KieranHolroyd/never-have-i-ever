<script>
  const name = "Never Have I Ever App";
  const version = "0.0.1";
  import NeverHaveIEver from "./components/Game.svelte";
  import { metatags } from "@sveltech/routify";
  metatags.title, (metatags.description = name);
  metatags.version = version;
</script>

<style>
  h1 {
    text-align: center;
  }
</style>

<h1>{name}</h1>
<NeverHaveIEver />
