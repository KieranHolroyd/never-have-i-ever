<script>
  const name = "Never have I ever";
  const version = "0.0.1";
  import NeverHaveIEver from "./components/Game.svelte";
  import { metatags } from "@sveltech/routify";
  metatags.title = name;
  metatags.description = name;
  metatags.version = version;
</script>

<style>
  h1 {
    text-align: center;
  }
  p.madeby {
    color: #afafaf;
    font-size: 15px;
    letter-spacing: 0.5px;
    font-weight: bolder;
  }
</style>

<div>
  <h1>{name}</h1>
  <hr />
  <NeverHaveIEver />
  <p class="madeby">
    Made by Kieran.
    <a href="/suggest">Suggest Changes.</a>
  </p>
</div>
