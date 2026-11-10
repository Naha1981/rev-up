import type { Pool } from 'pg';
import {encryptTenantKey,decryptTenantKey,type TenantCryptoEnv} from './tenant-crypto';
export interface CalendarEnv extends TenantCryptoEnv { GOOGLE_CALENDAR_CLIENT_ID?:string; GOOGLE_CALENDAR_CLIENT_SECRET?:string; }
const CALLBACK='/receptionist/google-calendar/callback/';
const TOKEN='https://oauth2.googleapis.com/token';
export function calendarConfigured(e:CalendarEnv){return !!(e.GOOGLE_CALENDAR_CLIENT_ID&&e.GOOGLE_CALENDAR_CLIENT_SECRET&&e.TENANT_FIELD_KEY);}
function unbase(s:string){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
function base(b:Uint8Array){return btoa(String.fromCharCode(...b)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
async function stateKey(e:CalendarEnv){if(!e.TENANT_FIELD_KEY)throw Error('Calendar security configuration missing.');return crypto.subtle.importKey('raw',unbase(e.TENANT_FIELD_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function calendarState(e:CalendarEnv,ws:string,user:string,now=Date.now()){
 const body=base(new TextEncoder().encode(JSON.stringify({ws,user,until:now+900000,nonce:crypto.randomUUID()})));
 const sig=await crypto.subtle.sign('HMAC',await stateKey(e),new TextEncoder().encode('calendar:'+body));return body+'.'+base(new Uint8Array(sig));
}
export async function checkCalendarState(e:CalendarEnv,state:string,ws:string,user:string,now=Date.now()){
 try{const [body,sig,...rest]=state.split('.');if(rest.length||!body||!sig)return false;
 if(!await crypto.subtle.verify('HMAC',await stateKey(e),unbase(sig),new TextEncoder().encode('calendar:'+body)))return false;
 const x=JSON.parse(new TextDecoder().decode(unbase(body)));return x.ws===ws&&x.user===user&&Number.isFinite(x.until)&&x.until>now&&x.until<=now+900000;
 }catch{return false;}
}
export async function calendarAuthUrl(e:CalendarEnv,baseUrl:string,ws:string,user:string){
 if(!calendarConfigured(e))throw Error('Google Calendar connection is not configured.');
 const p=new URLSearchParams({client_id:e.GOOGLE_CALENDAR_CLIENT_ID!,redirect_uri:baseUrl+CALLBACK,response_type:'code',scope:'https://www.googleapis.com/auth/calendar.events',access_type:'offline',prompt:'consent',state:await calendarState(e,ws,user)});
 return 'https://accounts.google.com/o/oauth2/v2/auth?'+p;
}
async function tokens(e:CalendarEnv,params:Record<string,string>,fetcher:typeof fetch){
 const r=await fetcher(TOKEN,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,client_id:e.GOOGLE_CALENDAR_CLIENT_ID||'',client_secret:e.GOOGLE_CALENDAR_CLIENT_SECRET||''}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Google Calendar authorisation failed. Reconnect your calendar.');return await r.json() as any;
}
export async function calendarConnect(db:Pool,e:CalendarEnv,ws:string,code:string,baseUrl:string,fetcher:typeof fetch=fetch){
 if(!calendarConfigured(e))throw Error('Google Calendar connection is not configured.');
 const t=await tokens(e,{code,redirect_uri:baseUrl+CALLBACK,grant_type:'authorization_code'},fetcher);
 if(!t.access_token||!t.refresh_token)throw Error('Google did not return calendar access. Please connect again.');
 const access=await encryptTenantKey(t.access_token,e),refresh=await encryptTenantKey(t.refresh_token,e);
 await db.query(`INSERT INTO receptionist_calendarconnection(id,workspace_id,google_email,access_token,refresh_token,token_expiry,calendar_id,connected_at) VALUES($1,$2,'',$3,$4,$5,'primary',now()) ON CONFLICT(workspace_id) DO UPDATE SET access_token=EXCLUDED.access_token,refresh_token=EXCLUDED.refresh_token,token_expiry=EXCLUDED.token_expiry`,[crypto.randomUUID(),ws,access,refresh,new Date(Date.now()+Math.max(60,Number(t.expires_in)||3600)*1000)]);
}
async function token(db:Pool,e:CalendarEnv,c:any,fetcher:typeof fetch){
 if(c.token_expiry&&new Date(c.token_expiry).getTime()>Date.now()+60000)return decryptTenantKey(c.access_token,e);
 const t=await tokens(e,{refresh_token:await decryptTenantKey(c.refresh_token,e),grant_type:'refresh_token'},fetcher);
 if(!t.access_token)throw Error('Google Calendar access expired. Reconnect your calendar.');
 await db.query('UPDATE receptionist_calendarconnection SET access_token=$1,token_expiry=$2 WHERE id=$3',[await encryptTenantKey(t.access_token,e),new Date(Date.now()+(Number(t.expires_in)||3600)*1000),c.id]);return t.access_token;
}
export function calendarEventId(booking:string){return booking.replace(/-/g,'').toLowerCase();}
export function calendarEventBody(b:any){
 const start=new Date(b.scheduled_start);if(!Number.isFinite(start.getTime()))throw Error('Choose a valid booking date and time.');
 const duration=Number(b.duration_minutes)||60;if(duration<1||duration>1440)throw Error('Booking duration must be between 1 and 1440 minutes.');
 return {summary:`${b.service||'Booking'} - ${b.contact_name||'Customer'}`,description:'Confirmed through RevUp.',start:{dateTime:start.toISOString(),timeZone:'Africa/Johannesburg'},end:{dateTime:new Date(start.getTime()+duration*60000).toISOString(),timeZone:'Africa/Johannesburg'}};
}
export async function calendarSync(db:Pool,e:CalendarEnv,ws:string,b:any,remove=false,fetcher:typeof fetch=fetch):Promise<'not-connected'|'synced'>{
 const c=(await db.query('SELECT * FROM receptionist_calendarconnection WHERE workspace_id=$1',[ws])).rows[0];if(!c)return 'not-connected';
 const access=await token(db,e,c,fetcher);const root='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(c.calendar_id||'primary')+'/events';
 const id=b.google_event_id||calendarEventId(b.id);const headers={'Authorization':'Bearer '+access,'Content-Type':'application/json'};
 if(remove){if(!b.google_event_id)return 'synced';const r=await fetcher(root+'/'+encodeURIComponent(id)+'?sendUpdates=none',{method:'DELETE',headers,signal:AbortSignal.timeout(15000)});if(![200,204,404,410].includes(r.status))throw Error('Calendar removal failed. Booking has not been cancelled.');await db.query('UPDATE receptionist_booking SET google_event_id=\'\' WHERE id=$1 AND workspace_id=$2',[b.id,ws]);return 'synced';}
 const body=calendarEventBody(b);
 const range=new URLSearchParams({timeMin:body.start.dateTime,timeMax:body.end.dateTime,singleEvents:'true',maxResults:'250'});
 const conflicts=await fetcher(root+'?'+range,{headers,signal:AbortSignal.timeout(15000)});
 if(!conflicts.ok)throw Error('Calendar availability could not be checked. Booking has not been confirmed.');
 const listed=await conflicts.json() as any;
 if(listed.nextPageToken||(listed.items||[]).some((v:any)=>v.id!==id&&v.status!=='cancelled'&&v.transparency!=='transparent'))throw Error('That time overlaps an event in your Google Calendar. Choose another time.');
 let r:Response;
 if(b.google_event_id){r=await fetcher(root+'/'+encodeURIComponent(id)+'?sendUpdates=none',{method:'PATCH',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});if([404,410].includes(r.status))r=await fetcher(root+'?sendUpdates=none',{method:'POST',headers,body:JSON.stringify({...body,id:calendarEventId(b.id)}),signal:AbortSignal.timeout(15000)});}
 else r=await fetcher(root+'?sendUpdates=none',{method:'POST',headers,body:JSON.stringify({...body,id}),signal:AbortSignal.timeout(15000)});
 // An interrupted retry can find the deterministic event already exists. Read it;
 // never count an unrelated or inaccessible event as a successful write.
 if(r.status===409){r=await fetcher(root+'/'+calendarEventId(b.id),{headers,signal:AbortSignal.timeout(15000)});if(r.ok){const v=await r.clone().json() as any;if(v.id!==calendarEventId(b.id)||v.summary!==body.summary||new Date(v.start?.dateTime||'').getTime()!==new Date(body.start.dateTime).getTime()||new Date(v.end?.dateTime||'').getTime()!==new Date(body.end.dateTime).getTime())throw Error('Calendar entry needs review before confirming.');}}
 if(!r.ok)throw Error('Google Calendar sync failed. Booking has not been confirmed.');const data=await r.json() as any;if(!data.id)throw Error('Google did not confirm the calendar entry.');
 await db.query('UPDATE receptionist_booking SET google_event_id=$1 WHERE id=$2 AND workspace_id=$3',[data.id,b.id,ws]);return 'synced';
}

export function calendarPanel(calendar:any,configured:boolean){
 const esc=(v:any)=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 return `<div class="card"><h2>Google Calendar</h2>${calendar?`<p>Connected${calendar.google_email?' as '+esc(calendar.google_email):''}. Confirmed bookings sync to ${esc(calendar.calendar_id||'primary')}. No customer invitation is sent.</p><form method="post" action="/receptionist/calendar/disconnect" onsubmit="return confirm('Disconnect Google Calendar? Existing calendar events will be kept.')"><button>Disconnect calendar</button></form>`:configured?`<p>Connect the Google account whose primary calendar should hold your bookings.</p><form method="post" action="/receptionist/calendar/connect"><button>Connect Google Calendar</button></form>`:'<p>Calendar connection is not configured. Your bookings are still kept here.</p>'}</div>`;
}
