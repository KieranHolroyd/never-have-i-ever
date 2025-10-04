import { pickRandom } from "mathjs";
import { INHIEGameState } from "../types";

export function select_question(game: INHIEGameState) {
  const sel_cat = pickRandom(game.catagories);

  const sel_question = chooseQuestionFromCatagory(sel_cat, game);

  if (sel_question === undefined && game.catagories.length === 1) {
    game.gameCompleted = true;
  } else if (sel_question === undefined && game.catagories.length >= 1) {
    game.catagories.splice(game.catagories.indexOf(sel_cat), 1);
    return select_question(game);
  }

  return { catagory: sel_cat, content: sel_question };
}

export function chooseQuestionFromCatagory(catagory: string, game: INHIEGameState) {
  let q = pickRandom(game.data[catagory].questions);
  game.data[catagory].questions.splice(
    game.data[catagory].questions.indexOf(q),
    1
  );
  return q;
}
