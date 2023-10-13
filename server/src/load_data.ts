import Database from "bun:sqlite";

const db = new Database(`${import.meta.dir}../assets/db.sqlite`);
(async () => {
  const catagories = await Bun.file(
    `${import.meta.dir}/../assets/data.json`
  ).json<{
    [key: string]: string[];
  }>();
  for (let c in catagories) {
    await db.run("INSERT INTO catagories (name, questions) VALUES (?, ?)", [
      c,
      JSON.stringify(catagories[c]),
    ]);
  }
})();
