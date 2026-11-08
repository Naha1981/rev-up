import copy
import datetime as dt
import pathlib
import tempfile
import unittest
import release_gate as g

class ReleaseGateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.art = pathlib.Path(self.temp.name) / 'artifact'
        self.art.mkdir(); (self.art/'index.html').write_text('SYNTHETIC TEST ARTIFACT')
        self.policy = dict(schema=1, app='synthetic', target='production', account='TEST-ACCOUNT', service='TEST-SERVICE',
            schema_revision='schema-1', config_revision='config-1', coverage_reviewed=True,
            required_checks=['unit', 'browser', 'isolation', 'migration', 'rollback'],
            production_resources=['PRODUCTION-REFERENCE-ONLY'], preview_resources=['DISPOSABLE-TEST-DB'],
            preview_external_effects='disabled', migration_strategy='expand-contract', pilot_mode='allowlist-default-off',
            auto_promote=False, max_proof_age_hours=24)
        self.commit='a'*40
        self.hash=g.digest(g.inventory(self.art))
        self.reports=[dict(check=n,status='passed',commit=self.commit,artifact_sha256=self.hash,assertions=1,
            evidence_sha256='b'*64,evidence_reference='synthetic-fixture-not-real-proof',finished_at=dt.datetime.now(dt.timezone.utc).isoformat()) for n in self.policy['required_checks']]
        self.evidence=pathlib.Path(self.temp.name)/'evidence'
        self.evidence.mkdir()
        for r in self.reports:
            f=self.evidence/(r['check']+'.txt'); f.write_text('SYNTHETIC '+r['check'])
            r['evidence_reference']=f.name; r['evidence_sha256']=g.sha_file(f)
        self.rollback=dict(version='TEST-OLD',artifact_sha256='c'*64,account='TEST-ACCOUNT',service='TEST-SERVICE',rehearsal_evidence_sha256='d'*64)
    def manifest(self):return g.make_manifest(self.policy,self.reports,self.commit,self.art,self.rollback,self.evidence)
    def approval(self,m):return dict(decision='Go + Sure',manifest_sha256=m['manifest_sha256'],account='TEST-ACCOUNT',service='TEST-SERVICE',original_message_reference='SYNTHETIC-ONLY',operator_reviewed_original=True,revalidated_current_state=True,expires_at=(dt.datetime.now(dt.timezone.utc)+dt.timedelta(hours=1)).isoformat())
    def test_valid_manifest(self):self.assertEqual(g.verify(self.manifest(),self.art,self.policy,self.evidence)['commit'],self.commit)
    def test_plan_is_not_deploy(self):
        m=self.manifest();self.assertEqual(g.promotion_plan(m,self.art,self.policy,self.approval(m),self.evidence)['mode'],'PLAN_ONLY')
    def test_artifact_tamper(self):
        m=self.manifest();(self.art/'index.html').write_text('changed')
        with self.assertRaises(g.Blocked):g.verify(m,self.art,self.policy,self.evidence)
    def test_added_asset(self):
        m=self.manifest();(self.art/'extra.js').write_text('extra')
        with self.assertRaises(g.Blocked):g.verify(m,self.art,self.policy,self.evidence)
    def test_removed_asset(self):
        m=self.manifest();(self.art/'index.html').unlink()
        with self.assertRaises(g.Blocked):g.verify(m,self.art,self.policy,self.evidence)
    def test_symlink(self):
        (self.art/'link').symlink_to(self.art/'index.html')
        with self.assertRaises(g.Blocked):self.manifest()
    def test_secret_file(self):
        (self.art/'.env.production').write_text('synthetic')
        with self.assertRaises(g.Blocked):self.manifest()
    def test_manifest_tamper(self):
        m=self.manifest();m['manifest']['commit']='c'*40
        with self.assertRaises(g.Blocked):g.verify(m,self.art,self.policy,self.evidence)
    def test_policy_changed(self):
        m=self.manifest();p=copy.deepcopy(self.policy);p['config_revision']='2'
        with self.assertRaises(g.Blocked):g.verify(m,self.art,p,self.evidence)
    def test_missing_check(self):
        self.reports.pop()
        with self.assertRaises(g.Blocked):self.manifest()
    def test_extra_check(self):
        self.reports.append(dict(self.reports[0],check='unknown'))
        with self.assertRaises(g.Blocked):self.manifest()
    def test_duplicate_check(self):
        self.reports.append(self.reports[0])
        with self.assertRaises(g.Blocked):self.manifest()
    def test_failed_check(self):
        self.reports[0]['status']='failed'
        with self.assertRaises(g.Blocked):self.manifest()
    def test_skipped_check(self):
        self.reports[0]['status']='skipped'
        with self.assertRaises(g.Blocked):self.manifest()
    def test_zero_assertions(self):
        self.reports[0]['assertions']=0
        with self.assertRaises(g.Blocked):self.manifest()
    def test_bool_assertions(self):
        self.reports[0]['assertions']=True
        with self.assertRaises(g.Blocked):self.manifest()
    def test_wrong_artifact(self):
        self.reports[0]['artifact_sha256']='0'*64
        with self.assertRaises(g.Blocked):self.manifest()
    def test_wrong_commit(self):
        self.reports[0]['commit']='b'*40
        with self.assertRaises(g.Blocked):self.manifest()
    def test_short_commit(self):
        self.commit='abc'
        with self.assertRaises(g.Blocked):self.manifest()
    def test_stale_proof(self):
        self.reports[0]['finished_at']='2020-01-01T00:00:00+00:00'
        with self.assertRaises(g.Blocked):self.manifest()
    def test_future_proof(self):
        self.reports[0]['finished_at']='2099-01-01T00:00:00+00:00'
        with self.assertRaises(g.Blocked):self.manifest()
    def test_no_timezone(self):
        self.reports[0]['finished_at']='2026-11-08T00:00:00'
        with self.assertRaises(g.Blocked):self.manifest()
    def test_missing_evidence(self):
        self.reports[0].pop('evidence_reference')
        with self.assertRaises(g.Blocked):self.manifest()
    def test_shared_production_db(self):
        self.policy['preview_resources']=self.policy['production_resources']
        with self.assertRaises(g.Blocked):self.manifest()
    def test_preview_sends_enabled(self):
        self.policy['preview_external_effects']='enabled'
        with self.assertRaises(g.Blocked):self.manifest()
    def test_unreviewed_coverage(self):
        self.policy['coverage_reviewed']=False
        with self.assertRaises(g.Blocked):self.manifest()
    def test_empty_coverage(self):
        self.policy['required_checks']=[]
        with self.assertRaises(g.Blocked):self.manifest()
    def test_automatic_promotion(self):
        self.policy['auto_promote']=True
        with self.assertRaises(g.Blocked):self.manifest()
    def test_destructive_migration(self):
        self.policy['migration_strategy']='destructive'
        with self.assertRaises(g.Blocked):self.manifest()
    def test_pilot_enabled_for_everyone(self):
        self.policy['pilot_mode']='everyone'
        with self.assertRaises(g.Blocked):self.manifest()
    def test_wrong_rollback_target(self):
        self.rollback['service']='OTHER'
        with self.assertRaises(g.Blocked):self.manifest()
    def test_missing_rollback_rehearsal(self):
        self.rollback.pop('rehearsal_evidence_sha256')
        with self.assertRaises(g.Blocked):self.manifest()
    def test_no_owner_approval(self):
        m=self.manifest();a=self.approval(m);a['decision']='GO SAFE RELEASE'
        with self.assertRaises(g.Blocked):g.promotion_plan(m,self.art,self.policy,a,self.evidence)
    def test_other_build_approval(self):
        m=self.manifest();a=self.approval(m);a['manifest_sha256']='0'*64
        with self.assertRaises(g.Blocked):g.promotion_plan(m,self.art,self.policy,a,self.evidence)
    def test_unreviewed_original(self):
        m=self.manifest();a=self.approval(m);a['operator_reviewed_original']=False
        with self.assertRaises(g.Blocked):g.promotion_plan(m,self.art,self.policy,a,self.evidence)
    def test_stale_target(self):
        m=self.manifest();a=self.approval(m);a['revalidated_current_state']=False
        with self.assertRaises(g.Blocked):g.promotion_plan(m,self.art,self.policy,a,self.evidence)
    def test_expired_approval(self):
        m=self.manifest();a=self.approval(m);a['expires_at']='2020-01-01T00:00:00+00:00'
        with self.assertRaises(g.Blocked):g.promotion_plan(m,self.art,self.policy,a,self.evidence)
    def test_different_service_approval(self):
        m=self.manifest();a=self.approval(m);a['service']='OTHER'
        with self.assertRaises(g.Blocked):g.promotion_plan(m,self.art,self.policy,a,self.evidence)

class MandatoryEvidenceTests(unittest.TestCase):
    setUp = ReleaseGateTests.setUp
    manifest = ReleaseGateTests.manifest
    approval = ReleaseGateTests.approval
    def test_evidence_required_make(self):
        with self.assertRaises(g.Blocked):g.make_manifest(self.policy,self.reports,self.commit,self.art,self.rollback)
    def test_evidence_required_verify(self):
        with self.assertRaises(g.Blocked):g.verify(self.manifest(),self.art,self.policy)
    def test_evidence_tamper_verify(self):
        m=self.manifest();(self.evidence/'unit.txt').write_text('tampered')
        with self.assertRaises(g.Blocked):g.verify(m,self.art,self.policy,self.evidence)
    def test_evidence_tamper_plan(self):
        m=self.manifest();(self.evidence/'unit.txt').unlink()
        with self.assertRaises(g.Blocked):g.promotion_plan(m,self.art,self.policy,self.approval(m),self.evidence)

class PreviewConfigTests(unittest.TestCase):
    def setUp(self):
        self.prod={'name':'production','routes':[{'pattern':'real.example'}],'d1_databases':[{'database_id':'PROD'}]}
        self.preview={'name':'synthetic-preview','routes':[],'workers_dev':True,'vars':{'NODE_ENV':'test','RELEASE_ENV':'synthetic-preview'}}
    def test_distinct_target_not_ready_for_deploy(self):
        self.assertFalse(g.preview_config_check(self.prod,self.preview)['deployment_ready'])
    def test_same_worker(self):
        self.preview['name']='production'
        with self.assertRaises(g.Blocked):g.preview_config_check(self.prod,self.preview)
    def test_production_domain(self):
        self.preview['routes']=self.prod['routes']
        with self.assertRaises(g.Blocked):g.preview_config_check(self.prod,self.preview)
    def test_shared_db(self):
        self.preview['d1_databases']=self.prod['d1_databases']
        with self.assertRaises(g.Blocked):g.preview_config_check(self.prod,self.preview)
    def test_shared_service(self):
        self.prod['services']=[{'service':'production-api'}];self.preview['services']=self.prod['services']
        with self.assertRaises(g.Blocked):g.preview_config_check(self.prod,self.preview)
    def test_wrong_environment(self):
        self.preview['vars']['NODE_ENV']='production'
        with self.assertRaises(g.Blocked):g.preview_config_check(self.prod,self.preview)
    def test_no_preview_address(self):
        self.preview['workers_dev']=False
        with self.assertRaises(g.Blocked):g.preview_config_check(self.prod,self.preview)
    def test_missing_marker(self):
        self.preview['vars'].pop('RELEASE_ENV')
        with self.assertRaises(g.Blocked):g.preview_config_check(self.prod,self.preview)

class EvidenceFilesTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=pathlib.Path(self.temp.name)/'evidence';self.root.mkdir()
        self.file=self.root/'unit.log';self.file.write_text('SYNTHETIC PASS one assertion')
        self.reports=[dict(check='unit',evidence_reference='unit.log',evidence_sha256=g.sha_file(self.file))]
    def test_verified_bytes_not_authenticity(self):
        r=g.evidence_files_check(self.reports,self.root)
        self.assertEqual(r['evidence_bytes_verified'],1);self.assertFalse(r['deployment_ready'])
        self.assertEqual(r['authentic_test_execution'],'UNVERIFIED')
    def test_tamper(self):
        self.file.write_text('different')
        with self.assertRaises(g.Blocked):g.evidence_files_check(self.reports,self.root)
    def test_missing_file(self):
        self.file.unlink()
        with self.assertRaises(g.Blocked):g.evidence_files_check(self.reports,self.root)
    def test_missing_root(self):
        with self.assertRaises(g.Blocked):g.evidence_files_check(self.reports,self.root/'missing')
    def test_empty_report_list(self):
        with self.assertRaises(g.Blocked):g.evidence_files_check([],self.root)
    def test_duplicate(self):
        with self.assertRaises(g.Blocked):g.evidence_files_check(self.reports*2,self.root)
    def test_bad_digest(self):
        self.reports[0]['evidence_sha256']='wrong'
        with self.assertRaises(g.Blocked):g.evidence_files_check(self.reports,self.root)
    def test_empty_file(self):
        self.file.write_text('');self.reports[0]['evidence_sha256']=g.sha_file(self.file)
        with self.assertRaises(g.Blocked):g.evidence_files_check(self.reports,self.root)
    def test_file_symlink(self):
        link=self.root/'link';link.symlink_to(self.file);self.reports[0]['evidence_reference']='link'
        with self.assertRaises(g.Blocked):g.evidence_files_check(self.reports,self.root)
    def test_directory_symlink(self):
        d=self.root/'sub';d.symlink_to(self.root,target_is_directory=True);self.reports[0]['evidence_reference']='sub/unit.log'
        with self.assertRaises(g.Blocked):g.evidence_files_check(self.reports,self.root)
    def test_root_symlink(self):
        link=self.root.parent/'rootlink';link.symlink_to(self.root,target_is_directory=True)
        with self.assertRaises(g.Blocked):g.evidence_files_check(self.reports,link)
    def test_unsafe_paths(self):
        for path in ['../unit.log','/unit.log','https://test.invalid/x','a/../unit.log','./unit.log','a//unit.log','a\\unit.log']:
            with self.subTest(path=path):
                self.reports[0]['evidence_reference']=path
                with self.assertRaises(g.Blocked):g.evidence_files_check(self.reports,self.root)

class UnreviewedPreviewTests(unittest.TestCase):
    setUp = PreviewConfigTests.setUp
    def test_unreviewed_keys_rejected(self):
        for key in ['env','route','triggers','queues','hyperdrive','durable_objects','send_email','ai','browser','dispatch_namespaces','unsafe','ratelimits','workflows','vectorize','vpc_services']:
            with self.subTest(key=key):
                candidate=dict(self.preview);candidate[key]={}
                with self.assertRaises(g.Blocked):g.preview_config_check(self.prod,candidate)

if __name__=='__main__':unittest.main()

