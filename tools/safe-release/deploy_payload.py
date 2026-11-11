#!/usr/bin/env python3
"""RevUp single-module deploy payload. Exclude timestamp README and diagnostic sourcemap.
Unknown build files fail closed. Does not deploy or change original build files.
"""
import argparse,pathlib,shutil
import release_gate as g

def prepare(build,output):
 root=pathlib.Path(build);out=pathlib.Path(output)
 g.require(root.is_dir() and not root.is_symlink(),'build root missing/symlink')
 files=list(root.iterdir())
 g.require({x.name for x in files}=={'worker.js','worker.js.map','README.md'},'unexpected/missing build files')
 g.require(all(x.is_file() and not x.is_symlink() for x in files),'unsafe build entry')
 g.require(not out.exists(),'payload destination already exists')
 data=(root/'worker.js').read_bytes();g.require(bool(data),'empty Worker')
 out.mkdir(parents=True);(out/'worker.js').write_bytes(data)
 return g.digest(g.inventory(out))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--build',required=True);p.add_argument('--output',required=True);a=p.parse_args();print(prepare(a.build,a.output))
