<script>
  import { ready } from "@sveltech/routify";
  let data = {};
  const avaliable_catagories = [
    "food",
    "guys",
    "dirty",
    "funny",
    "games",
    "girls",
    "gross",
    "rules",
    "random",
    "couples",
    "embarassing"
  ];
  let game_state = {
    catagory_select: true,
    current_catagory: []
  };

  fetch("https://api.npoint.io/7b9ef3a72b45bd130e80")
    .then(response => response.json())
    .then(json => {
      data = json;
    })
    .then($ready);

  function toggleSelection(catagory) {
    let newState = game_state;

    if (!newState.current_catagory.includes(catagory))
      newState.current_catagory.push(catagory);
    else
      newState.current_catagory.splice(
        newState.current_catagory.indexOf(catagory),
        1
      );

    game_state = { ...newState };
  }
</script>

<style>
  .active {
    background-color: red;
  }
</style>

<div>
  <p>Game Component</p>
  {#each avaliable_catagories as cat}
    <div
      class="catagory"
      class:active={game_state.current_catagory.includes(cat)}>
      <p on:click={() => toggleSelection(cat)}>{cat}</p>
    </div>
  {/each}
</div>
