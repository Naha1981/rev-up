/** Additive connection adapter. No router registration or existing-provider replacement.
 * Never accept user/account/auth-config identifiers from form data.
 * These values must come from authenticated membership and server-owned bindings.
 */
const API = 'https://backend.composio.dev/api/v3.1';
export type Binding = { workspaceId: string; userId: string; accountId: string; authConfigId: string; toolkit: string };
export type Policy = { enabled: boolean; projectId: string; apiKey: string; callbackOrigin: string; authConfigs: Readonly<Record<string,string>> };
export type Budget = { reserve(workspaceId: string, requestId: string): Promise<boolean> };
export type ToolGrant = { workspaceId: string; accountId: string; argumentsJson: string; requestId: string; tool: string; version: string; expiresAt: number; approved: boolean };
const id = (v: string) => typeof v==='string' && /^[A-Za-z0-9_-]{1,160}$/.test(v);
export class AppConnections {
 constructor(private policy: Policy, private budget: Budget, private send: typeof fetch = fetch) {}
 private ready() {
  if (!this.policy.enabled || this.policy.projectId !== 'pr_8367LVZaOfL2' || !this.policy.apiKey) throw new Error('App connections are disabled');
 }
 private async call(path: string, method = 'GET', body?: unknown): Promise<any> {
  this.ready();
  const r = await this.send(API+path,{method,headers:{'x-api-key':this.policy.apiKey,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});
  // Do not log response bodies: account payloads may contain credentials.
  if(!r.ok) throw new Error('App connection request failed');
  return r.json();
 }
 private user(workspaceId: string) {
  if(!id(workspaceId))throw new Error('Invalid workspace');
  return 'revup_ws_'+workspaceId;
 }
 async start(workspaceId: string, toolkit: string): Promise<{accountId:string;url:string}> {
  this.ready();
  const auth = Object.hasOwn(this.policy.authConfigs,toolkit) ? this.policy.authConfigs[toolkit] : '';
  if(!id(auth))throw new Error('App is not enabled');
  const origin=new URL(this.policy.callbackOrigin);
  if(origin.protocol!=='https:' || origin.origin!==this.policy.callbackOrigin)throw new Error('Invalid callback origin');
  const result=await this.call('/connected_accounts/link','POST',{user_id:this.user(workspaceId),auth_config_id:auth,callback_url:origin.origin+'/settings/connections/callback'});
  const url=new URL(result.redirect_url);
  if(url.protocol!=='https:' || !id(result.connected_account_id))throw new Error('Invalid connection response');
  return {accountId:result.connected_account_id,url:url.href};
 }
 private checkBinding(workspaceId:string,b:Binding){
  if(b.workspaceId!==workspaceId || b.userId!==this.user(workspaceId) || !id(b.accountId) || b.accountId==='instant_account' || b.authConfigId!==this.policy.authConfigs[b.toolkit])throw new Error('Connection does not belong to this business');
 }
 async status(workspaceId:string,b:Binding):Promise<string>{
  this.ready();this.checkBinding(workspaceId,b);
  const r=await this.call('/connected_accounts/'+encodeURIComponent(b.accountId));
  // New API versions may omit user_id. Fail closed until owner-scoped lookup is wired.
  if(r.user_id!==b.userId || r.id!==b.accountId || r.auth_config?.id!==b.authConfigId || r.toolkit?.slug!==b.toolkit)throw new Error('Connection ownership not confirmed');
  return r.status==='ACTIVE'?'connected':'attention_needed';
 }
 async execute(workspaceId:string,b:Binding,grant:ToolGrant,args:Record<string,unknown>,requestId:string):Promise<unknown>{
  this.ready();this.checkBinding(workspaceId,b);
  if(!grant.approved || grant.workspaceId!==workspaceId || grant.accountId!==b.accountId || grant.requestId!==requestId || grant.argumentsJson!==JSON.stringify(args) || grant.expiresAt<=Date.now() || !/^[A-Z0-9_]+$/.test(grant.tool) || !/^\d{8}_\d+$/.test(grant.version) || !id(requestId))throw new Error('Tool is not approved');
  // No defaults, instant account, latest-version drift, text-based execution or retries.
  if(await this.status(workspaceId,b)!=='connected')throw new Error('App is not connected');
  // Caller must supply an atomic durable reservation with a configured free-tier cap.
  // Reservation stays consumed on timeout/failure: retry may otherwise duplicate an action.
  if(!await this.budget.reserve(workspaceId,requestId))throw new Error('Connection budget reached');
  const r=await this.call('/tools/execute/'+encodeURIComponent(grant.tool),'POST',{user_id:b.userId,connected_account_id:b.accountId,version:grant.version,arguments:args});
  if(r.successful!==true)throw new Error('App action did not complete');
  return r.data;
 }
}
