<script>
  import { ready } from "@sveltech/routify";
  let data = {};
  let data_base = {};
  let current_question = {};
  let conf_reset_display = false;
  const available_catagories = [
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
    game_completed: false,
    current_catagory: []
  };

  init();

  async function init() {
    const res = await fetch("https://api.npoint.io/7b9ef3a72b45bd130e80");
    let json_res = JSON.stringify(await res.json());
    data_base = JSON.parse(json_res);
    data = JSON.parse(json_res);
    $ready();
  }

  function conf_reset() {
    conf_reset_display = true;
    setTimeout(() => {
      conf_reset_display = false;
    }, 2500);
  }

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
  function confirmSelections() {
    if (game_state.current_catagory.length > 0) {
      let newState = game_state;
      newState.catagory_select = false;
      game_state = { ...newState };
      selectQuestion();
    }
  }
  function selectCatagories() {
    let newState = game_state;
    newState.catagory_select = true;
    game_state = { ...newState };
  }
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }
  function selectQuestion() {
    const sel_cat =
      game_state.current_catagory[
        getRandomInt(0, game_state.current_catagory.length)
      ];

    const sel_question = chooseQuestionFromCatagory(sel_cat);

    console.log(sel_question, game_state.current_catagory.length);
    if (
      sel_question === undefined &&
      game_state.current_catagory.length === 1
    ) {
      let newState = game_state;
      newState.game_completed = true;
      game_state = { ...newState };
    } else if (
      sel_question === undefined &&
      game_state.current_catagory.length >= 1
    ) {
      let newStateX = game_state;
      newStateX.current_catagory.splice(
        newStateX.current_catagory.indexOf(sel_cat),
        1
      );
      game_state = { ...newStateX };
      current_question = selectQuestion();
      return;
    }

    console.log(`Catagory: ${sel_cat}; question: ${sel_question}`);
    return (current_question = {
      question_content: sel_question,
      question_catagory: sel_cat
    });
  }
  function chooseQuestionFromCatagory(cat) {
    const rand_number = getRandomInt(0, data[cat].length);
    let q = data[cat][rand_number];
    data[cat].splice(rand_number, 1);
    return q;
  }
  function reset() {
    //update game state to clear the game
    let newState = game_state;
    newState.game_completed = false;
    newState.catagory_select = true;
    newState.current_catagory = [];
    game_state = { ...newState };
    //reset to api data
    data = data_base;
    // set conf display to false
    conf_reset_display = false;
  }
</script>

<style>
  button {
    margin: 12px 6px;
    width: auto;
    padding-right: 8px;
    padding-left: 8px;
  }
  .catagories {
    width: 100%;
    display: flex;
    align-content: space-between;
    flex-direction: row;
    flex-wrap: wrap;
  }
  .catagory {
    max-width: 200px;
    margin: 12px auto;
    padding: 2px 10px;
    text-align: center;
  }
  .checktext {
    margin: 10px 0;
  }
  .question_container {
    margin: 10px auto;
    max-width: 500px;
    padding: 12px;
  }
  .question_container .small {
    margin: 0;
    text-transform: uppercase;
    font-size: 12px;
    font-weight: bold;
  }
  .question_container .question {
    font-size: 18px;
    margin: 4px 0;
  }
  .paper {
    margin: 24px auto;
  }
  p.nomore {
    text-align: center;
    color: #afafaf;
    font-size: 15px;
    letter-spacing: 0.5px;
    font-weight: bolder;
  }
</style>

<div class="board">
  {#if !game_state.game_completed}
    {#if game_state.catagory_select}
      <div class="catagories">
        {#each available_catagories as cat}
          <div class="catagory">
            <label class="checktext">
              <input
                type="checkbox"
                class="catagory"
                bind:group={game_state.current_catagory}
                value={cat}
                checked={game_state.current_catagory.includes(cat)} />
              <span>{cat}</span>
            </label>
          </div>
        {/each}
      </div>
      <button class="green-button" on:click={() => confirmSelections()}>
        Continue
      </button>
    {:else}
      {#if current_question.question_content !== undefined}
        <div class="paper question_container">
          <p class="small">Catagory: {current_question.question_catagory}</p>
          <p class="question">{current_question.question_content}</p>
        </div>
      {:else}
        <h2>Choose a question</h2>
      {/if}
      <hr />
      <button class="red-button" on:click={() => conf_reset()}>
        Reset Game
      </button>
      <button style="width: auto;" on:click={() => selectCatagories()}>
        Return to catagory selection
      </button>

      <button class="green-button" on:click={() => selectQuestion()}>
        Next Question
      </button>
    {/if}
  {:else}
    <p class="nomore">There are no more questions...</p>
    <button on:click={() => reset()}>Reset Game</button>
  {/if}
  {#if conf_reset_display}
    <hr />
    <button class="red-button" on:click={() => reset()}>Confirm Reset</button>
  {/if}
</div>
