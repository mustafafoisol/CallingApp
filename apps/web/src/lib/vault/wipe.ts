import Dexie from "dexie";

import { vaultDbName } from "./schema";

export async function wipeVault(userId: string): Promise<void> {
  await Dexie.delete(vaultDbName(userId));
}