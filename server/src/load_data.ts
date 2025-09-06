import Database from "bun:sqlite";
import { Catagories } from "types";

const db = new Database(`${import.meta.dir}../assets/db.sqlite`);
(async () => {
  const catagories = await Bun.file(
    `${import.meta.dir}/../assets/data.json`
  ).json() as Catagories;
  for (let c in catagories) {
    db.run(
      "INSERT INTO catagories (name, questions, is_nsfw) VALUES (?, ?, ?)",
      [c, JSON.stringify(catagories[c].questions), catagories[c].flags.is_nsfw]
    );
  }
})();
