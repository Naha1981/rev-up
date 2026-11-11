#!/usr/bin/env python3
"""Read-only authenticated GitHub verifier. CLI fetches canonical job logs itself.
A success proves consistency, not owner release authority or provider readiness.
"""
import argparse,base64,hashlib,json,pathlib,re,sys,datetime as dt
import release_gate as g
FILES=('unit.xml','db.xml','worker-unit-check.json','worker-db-check.json','release.json')
MAX_FILE=5_000_000
MAX_TOTAL=10_000_000

def emit(root):
 root=pathlib.Path(root);failed=False;total=0
 for name in FILES:
  p=root/name
  if not p.is_file() or p.is_symlink():print('EVIDENCE_MISSING:'+name);failed=True;continue
  data=p.read_bytes();total+=len(data)
  if not data or len(data)>MAX_FILE or total>MAX_TOTAL:print('EVIDENCE_OVERSIZE:'+name);failed=True;continue
  print('EVIDENCE_BEGIN:'+name+':'+str(len(data))+':'+hashlib.sha256(data).hexdigest())
  chunks=[base64.b64encode(data[i:i+144]).decode() for i in range(0,len(data),144)]
  for i,s in enumerate(chunks):print('EVIDENCE_DATA:'+name+':'+str(i)+':'+s)
  print('EVIDENCE_END:'+name+':'+str(len(chunks)))
 return not failed

def extract(text):
 g.require(len(text.encode())<=25_000_000,'log too large')
 active={};done={};total=0
 for line in text.splitlines():
  line=re.sub(r'^\d{4}-\d\d-\d\dT\S+Z ','',line)
  if line.startswith(('EVIDENCE_MISSING:','EVIDENCE_OVERSIZE:')):raise g.Blocked('missing/oversize evidence')
  if not line.startswith('EVIDENCE_'):continue
  fields=line.split(':');kind=fields[0]
  g.require(len(fields)>=3 and fields[1] in FILES,'invalid evidence marker')
  name=fields[1]
  if kind=='EVIDENCE_BEGIN':
   g.require(len(fields)==4 and name not in active and name not in done,'duplicate/invalid begin')
   g.require(fields[2].isdigit() and 0<int(fields[2])<=MAX_FILE and bool(g.HEX.fullmatch(fields[3])),'invalid size/hash')
   active[name]={'size':int(fields[2]),'hash':fields[3],'chunks':[]}
  elif kind=='EVIDENCE_DATA':
   g.require(len(fields)==4 and name in active and fields[2]==str(len(active[name]['chunks'])),'missing/duplicate/out-of-order chunk')
   try:b=base64.b64decode(fields[3],validate=True)
   except ValueError as e:raise g.Blocked('bad base64') from e
   total+=len(b);g.require(total<=MAX_TOTAL,'evidence total too large');active[name]['chunks'].append(b)
  elif kind=='EVIDENCE_END':
   g.require(len(fields)==3 and name in active and fields[2]==str(len(active[name]['chunks'])),'invalid end/chunk count')
   row=active.pop(name);b=b''.join(row['chunks']);g.require(len(b)==row['size'] and hashlib.sha256(b).hexdigest()==row['hash'],'size/hash mismatch');done[name]=b
  else:raise g.Blocked('unknown evidence marker')
 g.require(not active and set(done)==set(FILES),'truncated/missing evidence');return done

def status_check(run,jobs,expected,repository):
 g.require(isinstance(repository,dict) and repository.get('full_name') and type(repository.get('id')) is int,'canonical repository policy missing')
 g.require(all(run.get('repository',{}).get(k)==repository[k] for k in ('id','full_name')),'wrong repository or fork')
 g.require(type(run.get('id')) is int and type(run.get('run_attempt')) is int and run['run_attempt']>0,'run/attempt identity missing')
 g.require(run.get('repository',{}).get('private') is False,'BLOCKED_PRIVATE_OR_UNKNOWN_REPOSITORY_COST_APPROVAL_REQUIRED')
 g.require(run.get('status')=='completed' and run.get('conclusion')=='success','hosted run not completed/success')
 g.require(run.get('head_sha')==expected,'hosted commit mismatch')
 g.require(run.get('path')=='.github/workflows/revup-cf-gate.yml','wrong workflow')
 g.require(run.get('event') in ('push','pull_request'),'unreviewed event')
 found=[j for j in jobs.get('jobs',[]) if j.get('name')=='Unit tests + manifest gate']
 g.require(len(found)==1,'required hosted job absent/duplicate')
 job=found[0];g.require(job.get('status')=='completed' and job.get('conclusion')=='success','hosted job skipped/neutral/failed/incomplete')
 g.require(job.get('run_id')==run.get('id') and job.get('head_sha')==expected and job.get('run_attempt')==run['run_attempt'],'job identity mismatch')
 g.require(type(job.get('id')) is int and job.get('url')=='https://api.github.com/repos/'+repository['full_name']+'/actions/jobs/'+str(job['id']),'job repository/url identity mismatch')
 return job

def verify(run,jobs,log,expected,artifact,policy,out):
 job=status_check(run,jobs,expected,policy.get('canonical_repository'))
 g.require(isinstance(log,dict) and log.get('repository')==policy['canonical_repository'] and log.get('job_id')==job['id'] and log.get('run_id')==run['id'] and log.get('run_attempt')==run['run_attempt'],'wrong job log identity')
 files=extract(log['text']);out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True)
 for name,data in files.items():
  target=out/name;g.require(not target.is_symlink(),'evidence symlink');target.write_bytes(data)
 envelope=json.loads(files['release.json']);g.require(envelope.get('manifest',{}).get('commit')==expected,'manifest commit mismatch')
 body=g.verify(envelope,artifact,policy,out)
 for check,name in [('worker-unit','worker-unit-check.json'),('worker-db','worker-db-check.json')]:
  report=json.loads(files[name]);g.require(report in body['checks'] and report.get('check')==check,'report/manifest mismatch')
 return{'verified':True,'commit':expected,'manifest_sha256':envelope['manifest_sha256'],'repository_private':False,'run_status':'completed','run_conclusion':'success','job_conclusion':'success','repository':policy['canonical_repository'],'run_id':run['id'],'run_attempt':run['run_attempt'],'job_id':job['id'],'authenticated_retrieval':True,'verified_at':dt.datetime.now(dt.timezone.utc).isoformat(),'production_approved':False}

def authenticated_inputs(repository,run_id,expected,token):
 import urllib.request,urllib.error
 class NoRedirect(urllib.request.HTTPRedirectHandler):
  def redirect_request(self,*args,**kwargs):return None
 opener=urllib.request.build_opener(NoRedirect)
 base='https://api.github.com/repos/'+repository['full_name']+'/actions'
 def get(url,raw=False):
  req=urllib.request.Request(url,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'})
  try:
   with opener.open(req,timeout=30) as r:data=r.read(25_000_001)
  except urllib.error.HTTPError as e:
   if raw and e.code in (301,302,307):
    location=e.headers.get('Location','');g.require(location.startswith('https://'),'unsafe log redirect')
    with urllib.request.urlopen(location,timeout=30) as r:data=r.read(25_000_001)
   else:raise
  g.require(len(data)<=25_000_000,'GitHub response too large')
  return data.decode('utf-8') if raw else json.loads(data)
 run=get(base+'/runs/'+str(run_id))
 jobs=get(base+'/runs/'+str(run_id)+'/attempts/'+str(run.get('run_attempt'))+'/jobs?per_page=100')
 job=status_check(run,jobs,expected,repository)
 text=get(base+'/jobs/'+str(job['id'])+'/logs',True)
 return run,jobs,{'text':text,'repository':repository,'job_id':job['id'],'run_id':run['id'],'run_attempt':run['run_attempt']}

def main():
 p=argparse.ArgumentParser();sub=p.add_subparsers(dest='action',required=True);e=sub.add_parser('emit');e.add_argument('--root',required=True);v=sub.add_parser('verify')
 for name in ['run-id','token-path','commit','artifact','policy','out']:v.add_argument('--'+name,required=True)
 a=p.parse_args()
 try:
  if a.action=='emit':return 0 if emit(a.root) else 1
  policy=g.read(a.policy);run,jobs,log=authenticated_inputs(policy.get('canonical_repository'),int(a.run_id),a.commit,pathlib.Path(a.token_path).read_text().strip())
  print(json.dumps(verify(run,jobs,log,a.commit,a.artifact,policy,a.out),indent=2));return 0
 except (g.Blocked,ValueError,OSError,KeyError,TypeError) as e:print('BLOCKED: '+str(e),file=sys.stderr);return 1
if __name__=='__main__':sys.exit(main())
