import { encryptTenantKey, type TenantCryptoEnv } from "./tenant-crypto";
// Only authentication failures invalidate a saved key. Never persist raw provider errors.
export async function connectFailure(db: any, workspaceId: string, status?: number): Promise<string> {
  if (status === 401 || status === 403) {
    const message = "Your messaging key stopped working. Paste a fresh key from your messaging account, then try again.";
    await db.query("UPDATE receptionist_tenantmessagingconnection SET status='needs_attention', last_error=$1, updated_at=now() WHERE workspace_id=$2", [message, workspaceId]);
    return message;
  }
  if (status === 402) return "Your messaging plan covers 2 numbers. Check your messaging account plan before connecting more.";
  return "Could not start the connection. Please try again.";
}

export async function saveTenantKey(db: any, id: string, workspaceId: string, key: string, profileId: string, env: TenantCryptoEnv) {
  const encryptedKey = await encryptTenantKey(key, env);
  return db.query(`INSERT INTO receptionist_tenantmessagingconnection
    (id, workspace_id, api_key, profile_id, account_id, phone_number, webhook_id, webhook_secret, status, last_error, created_at, updated_at)
    VALUES($1,$2,$3,$4,'','','','','key_valid','',now(),now())
    ON CONFLICT (workspace_id) DO UPDATE SET api_key=EXCLUDED.api_key, profile_id=EXCLUDED.profile_id,
    status='key_valid', last_error='', updated_at=now()`, [id, workspaceId, encryptedKey, profileId]);
}
