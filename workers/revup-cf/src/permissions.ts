// Keep capability names aligned with apps/members/models.py.
const ALL=['create_posts','edit_others_posts','approve_posts','publish_directly','manage_social_accounts','view_analytics','use_inbox','reply_from_inbox','manage_workspace_settings','upload_media','edit_media','delete_media','manage_media','use_responder'];
const BUILTIN:Record<string,string[]>={owner:ALL,manager:ALL.filter(k=>!['manage_workspace_settings','use_responder'].includes(k)),editor:['create_posts','edit_others_posts','view_analytics','use_inbox','reply_from_inbox','upload_media','edit_media','delete_media'],contributor:['create_posts','upload_media','edit_media'],client:['approve_posts','view_analytics'],viewer:['view_analytics']};
export function hasWorkspacePermission(mem:any,key:string):boolean {
 if(mem.custom_role_id)return mem.custom_permissions?.[key]===true;
 return (BUILTIN[mem.workspace_role]||[]).includes(key);
}
export function requiredWorkspacePermission(path:string,method:string):string|null {
 const write=!['GET','HEAD','OPTIONS'].includes(method);
 if(path==='/switch')return null;
 if(/^\/(onboarding|business-type|assistant|radar|revenue-mode)(\/|$)/.test(path))return write?'manage_workspace_settings':null;
 if(path.startsWith('/receptionist/connect')||path.startsWith('/receptionist/calendar')||path.startsWith('/receptionist/google-calendar')||path.startsWith('/settings/connections'))return 'manage_social_accounts';
 if(path==='/receptionist')return 'use_inbox';
 if(path.startsWith('/billing'))return write?'manage_workspace_settings':null;
 if(/^\/approvals(\/|$)/.test(path))return 'approve_posts';
 if(/^\/media(\/|$)/.test(path))return write?(path.endsWith('/delete')?'delete_media':'upload_media'):'create_posts';
 if(/^\/(posts|team|pages)(\/|$)/.test(path))return 'create_posts';
 if(/^\/(inbox|frontdesk|bookings|waitlist|loyalty|orders|quotes|reviews|campaigns|competitors|opportunities|menu|prospects|support)(\/|$)/.test(path))return write?'reply_from_inbox':'use_inbox';
 if(path==='/analytics')return 'view_analytics';
 // New authenticated mutations must declare a capability rather than default allow.
 return write?'manage_workspace_settings':null;
}
