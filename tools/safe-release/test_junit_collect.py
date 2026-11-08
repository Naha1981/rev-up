import pathlib,tempfile,unittest
import junit_collect as j
import release_gate as g
class JUnitCollectorTests(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory();self.addCleanup(self.t.cleanup);self.p=pathlib.Path(self.t.name)/'junit.xml'
  self.xml='<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase classname="synthetic" name="one" /></testsuite>'
 def call(self,xml=None,expected=None):
  self.p.write_text(self.xml if xml is None else xml)
  return j.collect(self.p,['synthetic::one'] if expected is None else expected,'unit','a'*40,'b'*64,'junit.xml')
 def test_valid(self):self.assertEqual(self.call()['assertions'],1)
 def test_failed(self):
  with self.assertRaises(g.Blocked):self.call(self.xml.replace(' />','><failure /></testcase>'))
 def test_skipped(self):
  with self.assertRaises(g.Blocked):self.call(self.xml.replace(' />','><skipped /></testcase>'))
 def test_error(self):
  with self.assertRaises(g.Blocked):self.call(self.xml.replace(' />','><error /></testcase>'))
 def test_zero(self):
  with self.assertRaises(g.Blocked):self.call('<testsuite tests="0" />')
 def test_count_mismatch(self):
  with self.assertRaises(g.Blocked):self.call(self.xml.replace('tests="1"','tests="50"'))
 def test_registry_gap(self):
  with self.assertRaises(g.Blocked):self.call(expected=['synthetic::one','synthetic::missing'])
 def test_registry_extra(self):
  with self.assertRaises(g.Blocked):self.call(expected=['other::case'])
 def test_duplicate(self):
  with self.assertRaises(g.Blocked):self.call(self.xml.replace('tests="1"','tests="2"').replace('</testsuite>','<testcase classname="synthetic" name="one" /></testsuite>'))
 def test_dtd(self):
  with self.assertRaises(g.Blocked):self.call('<!DOCTYPE a>'+self.xml)
 def test_bad_xml(self):
  with self.assertRaises(g.Blocked):self.call('<testsuite')
 def test_disabled(self):
  with self.assertRaises(g.Blocked):self.call(self.xml.replace('<testsuite ','<testsuite disabled="1" '))
 def test_not_run(self):
  with self.assertRaises(g.Blocked):self.call(self.xml.replace('<testcase ','<testcase status="notrun" '))
 def test_missing_identity(self):
  with self.assertRaises(g.Blocked):self.call(self.xml.replace('classname="synthetic"',''))
