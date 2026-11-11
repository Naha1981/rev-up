import pathlib,tempfile,unittest
import deploy_payload as d
import release_gate as g
class PayloadTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=pathlib.Path(self.tmp.name);self.build=self.root/'build';self.build.mkdir()
  for n,b in [('worker.js',b'EXACT-DEPLOY-BYTES'),('worker.js.map',b'path-dependent'),('README.md',b'timestamp-dependent')]: (self.build/n).write_bytes(b)
 def test_worker_only_exact(self):
  out=self.root/'payload';d.prepare(self.build,out);self.assertEqual(list(x.name for x in out.iterdir()),['worker.js']);self.assertEqual((out/'worker.js').read_bytes(),b'EXACT-DEPLOY-BYTES')
 def test_metadata_change_same_digest(self):
  a=d.prepare(self.build,self.root/'a');(self.build/'README.md').write_text('other time');(self.build/'worker.js.map').write_text('other path');self.assertEqual(a,d.prepare(self.build,self.root/'b'))
 def test_worker_change_changes_digest(self):
  a=d.prepare(self.build,self.root/'a');(self.build/'worker.js').write_text('changed');self.assertNotEqual(a,d.prepare(self.build,self.root/'b'))
 def test_unknown_file_blocks(self):
  (self.build/'other.wasm').write_bytes(b'NEW-RESOURCE')
  with self.assertRaises(g.Blocked):d.prepare(self.build,self.root/'payload')
 def test_missing_file_blocks(self):
  (self.build/'worker.js').unlink()
  with self.assertRaises(g.Blocked):d.prepare(self.build,self.root/'payload')
 def test_symlink_blocks(self):
  (self.build/'worker.js').unlink();(self.build/'worker.js').symlink_to(self.build/'README.md')
  with self.assertRaises(g.Blocked):d.prepare(self.build,self.root/'payload')
