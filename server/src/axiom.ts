import { Axiom } from "@axiomhq/js";

const axiom = new Axiom({
  token: process.env.AXIOM_TOKEN,
  orgId: process.env.AXIOM_ORG_ID,
});

export function ingestEvent(events: object | object[]) {
  const eventsArray = Array.isArray(events) ? events : [events];

  for (const event of eventsArray) {
    if (!Object.hasOwn(event, "timestamp")) {
      event["timestamp"] = Date.now();
    }
  }

  axiom.ingest("gaming", eventsArray, {
    timestampField: "timestamp",
    timestampFormat: "epoch",
  });
}

export default axiom;
