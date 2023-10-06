import Database from "bun:sqlite";

const db = new Database("./games/db.sqlite");
(async () => {
  const catagories = await Bun.file("./data.json").json<{
    [key: string]: string[];
  }>();
  for (let c in catagories) {
    await db.run("INSERT INTO catagories (name, questions) VALUES (?, ?)", [
      c,
      JSON.stringify(catagories[c]),
    ]);
  }
})();
