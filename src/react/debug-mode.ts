export function isProductionEnv(): boolean {
  if (typeof process !== "undefined" && process.env["NODE_ENV"] === "production") {
    return true;
  }
  try {
    const env = (import.meta as { env?: { PROD?: boolean; MODE?: string } }).env;
    if (env?.PROD === true || env?.MODE === "production") return true;
  } catch {
    return false;
  }
  return false;
}

export function shouldOfferDebug(debug?: boolean): boolean {
  if (isProductionEnv() || debug === false) return false;
  return true;
}
