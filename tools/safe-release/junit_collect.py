#!/usr/bin/env python3
"""Convert retained JUnit bytes into a gate report. No tests or network invoked.
A trusted CI job must bind the supplied commit/artifact and expected-case registry
before untrusted code runs. Parsing does not authenticate test execution.
"""
import argparse,datetime as dt,json,pathlib,sys,xml.etree.ElementTree as ET
import release_gate as g

def collect(path, expected, check, commit, artifact_hash, reference):
    path=pathlib.Path(path)
    g.require(path.is_file() and not path.is_symlink(), 'report file missing/symlinked')
    raw=path.read_bytes()
    g.require(0 < len(raw) <= 10_000_000, 'empty or excessive JUnit report')
    g.require(b'<!DOCTYPE' not in raw.upper() and b'<!ENTITY' not in raw.upper(), 'DTD/entities forbidden')
    try:root=ET.fromstring(raw)
    except ET.ParseError as e:raise g.Blocked('malformed JUnit') from e
    g.require(root.tag in ('testsuite','testsuites'), 'unsupported JUnit root')
    g.require(isinstance(expected,list) and bool(expected) and all(isinstance(x,str) and x for x in expected), 'expected cases missing')
    g.require(len(expected)==len(set(expected)), 'duplicate expected cases')
    g.require(isinstance(check,str) and bool(check), 'check name missing')
    g.require(bool(g.COMMIT.fullmatch(commit)) and bool(g.HEX.fullmatch(artifact_hash)), 'candidate identity missing')
    cases=list(root.iter('testcase'));names=[]
    g.require(bool(cases), 'no executed cases')
    g.require(not list(root.iter('failure')) and not list(root.iter('error')) and not list(root.iter('skipped')), 'failed/error/skipped JUnit case')
    for suite in list(root.iter('testsuite'))+([root] if root.tag=='testsuites' else []):
        for field in ('failures','errors','skipped','disabled'):
            if field in suite.attrib:g.require(suite.attrib[field]=='0', 'nonzero/invalid suite '+field)
        if 'tests' in suite.attrib:
            g.require(suite.attrib['tests'].isdigit() and int(suite.attrib['tests'])==len(list(suite.iter('testcase'))), 'suite case count mismatch')
    for case in cases:
        g.require(case.get('name') and case.get('classname'), 'case identity missing')
        g.require(case.get('status','run') in ('run','passed') and case.get('result','completed')=='completed', 'unexecuted testcase')
        names.append(case.get('classname')+'::'+case.get('name'))
    g.require(len(names)==len(set(names)), 'duplicate case identity')
    g.require(set(names)==set(expected), 'case registry mismatch')
    return dict(check=check,status='passed',commit=commit,artifact_sha256=artifact_hash,
                assertions=len(cases),evidence_sha256=g.sha_file(path),evidence_reference=reference,
                finished_at=dt.datetime.now(dt.timezone.utc).isoformat(),
                assertion_unit='JUnit test cases, not assertion statements',
                execution_authenticity='UNVERIFIED; trusted CI binding required')

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for f in ['junit','expected-cases','check','commit','artifact-sha256','evidence-reference','output']:p.add_argument('--'+f,required=True)
    a=p.parse_args()
    try:
        r=collect(a.junit,json.loads(pathlib.Path(a.expected_cases).read_text()),a.check,a.commit,a.artifact_sha256,a.evidence_reference)
        out=pathlib.Path(a.output);g.require(out.resolve()!=pathlib.Path(a.junit).resolve(),'cannot overwrite JUnit evidence')
        out.write_text(json.dumps(r,indent=2)+'\n');print('Collected JUnit cases:',r['assertions'],'; execution authenticity UNVERIFIED')
    except (g.Blocked,ValueError,OSError,TypeError) as e:print('BLOCKED:',e,file=sys.stderr);return 1
    return 0
if __name__=='__main__':sys.exit(main())
