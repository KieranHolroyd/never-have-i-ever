<script>
  import { ready } from "@sveltech/routify";
  let data = {};
  let data_base = {};
  let current_question = {};
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

  fetch("https://api.npoint.io/7b9ef3a72b45bd130e80")
    .then(response => response.json())
    .then(json => {
      data_base = json;
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

    if (sel_question === undefined) {
      let newState = game_state;
      newState.game_completed = true;
      game_state = { ...newState };
    }

    console.log(`Catagory: ${sel_cat}; question: ${sel_question}`);
    current_question = {
      question_content: sel_question,
      question_catagory: sel_cat
    };
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
  }
</script>

<style>
  .container {
    position: relative;
    max-width: 600px;
    margin: auto;
  }
  button {
    border-radius: 8px;
    padding: 6px 10px;
    border: 2px solid #000;
  }
  .catagories {
    width: 100%;
    display: flex;
    align-content: space-between;
    flex-direction: row;
    flex-wrap: wrap;
  }
  .catagory {
    width: 200px;
    margin: 12px auto;
    border-radius: 8px;
    box-shadow: 3px 3px 12px #d9d9d9, -3px -3px 12px #ffffff;
    padding: 2px 10px;
    text-align: center;
  }
  .catagory.active {
    box-shadow: inset 3px 3px 12px #d9d9d9, inset -3px -3px 12px #ffffff;
    background-color: #f8f8f8;
  }
  .catagory p {
    text-transform: capitalize;
    user-select: none;
  }
  .nextln {
    display: block;
    float: left;
  }
  .question_container {
    margin: 10px 0;
    max-width: 500px;
    padding: 12px;
    background-color: #f4f4f4;
    border-radius: 8px;
    box-shadow: inset 0 0 4px 0 rgba(0, 0, 0, 0.1);
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
  button.primary {
    background-color: rgb(40, 145, 206);
    color: #fff;
  }
</style>

<div class="container">
  <div class="board">
    {#if !game_state.game_completed}
      {#if game_state.catagory_select}
        <div class="catagories">
          {#each available_catagories as cat}
            <div
              class="catagory"
              class:active={game_state.current_catagory.includes(cat)}
              on:click={() => toggleSelection(cat)}>
              <p>{cat}</p>
            </div>
          {/each}
        </div>
        <div class="nextln" />
        <button class="primary" on:click={() => confirmSelections()}>
          Continue
        </button>
      {:else}
        <h1>Game Board</h1>
        <div class="nextln" />
        {#if current_question.question_content !== undefined}
          <div class="question_container">
            <p class="small">Catagory: {current_question.question_catagory}</p>
            <p class="question">{current_question.question_content}</p>
          </div>
        {:else}
          <h2>Choose a question</h2>
        {/if}
        <div class="nextln" />
        <button on:click={() => selectCatagories()}>
          Return to catagory selection
        </button>
        <button on:click={() => reset()}>Reset Game</button>

        <button class="primary" on:click={() => selectQuestion()}>
          Next Question
        </button>
      {/if}
    {:else}
      <h1>There are no more questions...</h1>
      <button on:click={() => reset()}>Reset Game</button>
    {/if}
  </div>
</div>
