import contextlib,hashlib,io,pathlib,tempfile,unittest
import hosted_gate as h
import release_gate as g
class HostedGateTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=pathlib.Path(self.tmp.name)
  self.bytes={n:(n+'\r\n'+('x'*333)+'\n').encode() for n in h.FILES}
  for n,b in self.bytes.items():(self.root/n).write_bytes(b)
  self.repository={'id':123,'full_name':'test/canonical'}
  self.run={'id':1,'run_attempt':1,'repository':dict(self.repository,private=False),'status':'completed','conclusion':'success','head_sha':'a'*40,'path':'.github/workflows/revup-cf-gate.yml','event':'push'}
  self.jobs={'jobs':[{'name':'Unit tests + manifest gate','status':'completed','conclusion':'success','head_sha':'a'*40,'run_id':1,'run_attempt':1,'id':2,'url':'https://api.github.com/repos/test/canonical/actions/jobs/2'}]}
 def text(self):
  o=io.StringIO()
  with contextlib.redirect_stdout(o):self.assertTrue(h.emit(self.root))
  return o.getvalue()
 def test_exact_roundtrip(self):self.assertEqual(h.extract(self.text()),self.bytes)
 def test_timestamp_roundtrip(self):self.assertEqual(h.extract(''.join('2026-11-11T04:00:00.123Z '+x+'\n' for x in self.text().splitlines())),self.bytes)
 def test_truncated(self):
  with self.assertRaises(g.Blocked):h.extract(self.text()[:-40])
 def test_missing_marker(self):
  with self.assertRaises(g.Blocked):h.extract('\n'.join(x for x in self.text().splitlines() if not x.startswith('EVIDENCE_END:unit.xml')))
 def test_duplicate_begin(self):
  t=self.text()
  with self.assertRaises(g.Blocked):h.extract(t+t)
 def test_missing_chunk(self):
  with self.assertRaises(g.Blocked):h.extract('\n'.join(x for x in self.text().splitlines() if not x.startswith('EVIDENCE_DATA:unit.xml:1:')))
 def test_hash_mismatch(self):
  t=self.text();a=t.splitlines()[0];bad=a.rsplit(':',1)[0]+':'+'0'*64
  with self.assertRaises(g.Blocked):h.extract(t.replace(a,bad))
 def test_explicit_missing(self):
  (self.root/'db.xml').unlink();o=io.StringIO()
  with contextlib.redirect_stdout(o):self.assertFalse(h.emit(self.root))
  with self.assertRaises(g.Blocked):h.extract(o.getvalue())
 def test_public_success(self):h.status_check(self.run,self.jobs,'a'*40,self.repository)
 def test_private_rejected(self):
  self.run['repository']['private']=True
  with self.assertRaises(g.Blocked):h.status_check(self.run,self.jobs,'a'*40,self.repository)
 def test_absent_rejected(self):
  self.jobs['jobs']=[]
  with self.assertRaises(g.Blocked):h.status_check(self.run,self.jobs,'a'*40,self.repository)
 def test_not_success_rejected(self):
  for result in ['skipped','neutral','failure','cancelled',None]:
   self.jobs['jobs'][0]['conclusion']=result
   with self.assertRaises(g.Blocked):h.status_check(self.run,self.jobs,'a'*40,self.repository)
 def test_wrong_commit_rejected(self):
  with self.assertRaises(g.Blocked):h.status_check(self.run,self.jobs,'b'*40,self.repository)
 def test_incomplete_rejected(self):
  self.run['status']='in_progress'
  with self.assertRaises(g.Blocked):h.status_check(self.run,self.jobs,'a'*40,self.repository)

 def test_missing_verifier_result_blocks_release(self):
  with self.assertRaises(g.Blocked):g.hosted_verification_check(None,'a'*40,'b'*64)
 def test_bad_verifier_conclusions_block_release(self):
  import datetime as dt
  r={'verified':True,'commit':'a'*40,'manifest_sha256':'b'*64,'repository_private':False,'run_status':'completed','run_conclusion':'success','job_conclusion':'success','repository':self.repository,'authenticated_retrieval':True,'run_id':1,'job_id':2,'run_attempt':1,'verified_at':dt.datetime.now(dt.timezone.utc).isoformat()}
  g.hosted_verification_check(r,'a'*40,'b'*64,self.repository)
  for conclusion in ['skipped','neutral','failure','cancelled',None]:
   with self.assertRaises(g.Blocked):g.hosted_verification_check(dict(r,job_conclusion=conclusion),'a'*40,'b'*64)
 def test_private_verifier_result_blocks_release(self):
  with self.assertRaises(g.Blocked):g.hosted_verification_check({'verified':True,'repository_private':True},'a'*40,'b'*64)
 def valid_reports(self):
  import json,datetime as dt
  artifact=self.root/'artifact';artifact.mkdir();(artifact/'worker.js').write_bytes(b'SYNTHETIC_NOT_A_REAL_BUILD')
  policy={'canonical_repository':self.repository,'schema':1,'app':'synthetic','target':'test','account':'SYNTHETIC','service':'SYNTHETIC','schema_revision':'test','config_revision':'test','coverage_reviewed':True,'required_checks':['worker-unit','worker-db'],'production_resources':['NOT_REAL'],'preview_resources':['TEST_ONLY'],'preview_external_effects':'disabled','migration_strategy':'expand-contract','pilot_mode':'allowlist-default-off','auto_promote':False,'max_proof_age_hours':24}
  reports=[]
  for kind,xml in [('worker-unit','unit.xml'),('worker-db','db.xml')]:
   report={'check':kind,'status':'passed','commit':'a'*40,'artifact_sha256':g.digest(g.inventory(artifact)),'assertions':1,'evidence_reference':xml,'evidence_sha256':g.sha_file(self.root/xml),'finished_at':dt.datetime.now(dt.timezone.utc).isoformat()};reports.append(report);(self.root/(kind+'-check.json')).write_text(json.dumps(report))
  rollback={'version':'NOT_REAL','artifact_sha256':'c'*64,'account':'SYNTHETIC','service':'SYNTHETIC','rehearsal_evidence_sha256':'d'*64}
  envelope=g.make_manifest(policy,reports,'a'*40,artifact,rollback,self.root);(self.root/'release.json').write_text(json.dumps(envelope));return artifact,policy
 def test_verified_manifest_roundtrip(self):
  art,policy=self.valid_reports();result=h.verify(self.run,self.jobs,self.log(),'a'*40,art,policy,self.root/'extracted');self.assertTrue(result['verified']);self.assertFalse(result['production_approved'])
 def test_artifact_mismatch_blocks_hosted_verification(self):
  art,policy=self.valid_reports();(art/'worker.js').write_text('CHANGED')
  with self.assertRaises(g.Blocked):h.verify(self.run,self.jobs,self.log(),'a'*40,art,policy,self.root/'extracted')

 def log(self):return dict(text=self.text(),repository=self.repository,run_id=1,run_attempt=1,job_id=2)
 def test_fork_repository_rejected(self):
  self.run['repository']['full_name']='attacker/fork'
  with self.assertRaises(g.Blocked):h.status_check(self.run,self.jobs,'a'*40,self.repository)
 def test_wrong_repository_id_rejected(self):
  self.run['repository']['id']=999
  with self.assertRaises(g.Blocked):h.status_check(self.run,self.jobs,'a'*40,self.repository)
 def test_wrong_job_log_rejected(self):
  art,policy=self.valid_reports();log=self.log();log['job_id']=999
  with self.assertRaises(g.Blocked):h.verify(self.run,self.jobs,log,'a'*40,art,policy,self.root/'out')
 def test_wrong_job_attempt_rejected(self):
  self.jobs['jobs'][0]['run_attempt']=2
  with self.assertRaises(g.Blocked):h.status_check(self.run,self.jobs,'a'*40,self.repository)
 def test_promotion_wrong_repository_rejected(self):
  import datetime as dt
  r=dict(verified=True,repository_private=False,run_status='completed',run_conclusion='success',job_conclusion='success',commit='a'*40,manifest_sha256='b'*64,repository=dict(id=999,full_name='attacker/fork'))
  with self.assertRaises(g.Blocked):g.hosted_verification_check(r,'a'*40,'b'*64,self.repository)
