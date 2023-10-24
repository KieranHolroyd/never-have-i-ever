export function dbl(op: string, debug: any) {
  if (Bun.env.DEBUG) {
    console.log("[DEBUG]", op, debug);
  }
}
