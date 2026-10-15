"""Build a current paper PDF in an isolated snapshot; never edit the paper repo."""
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
import fitz

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('/apdcephfs_cq12/share_360969/yiqun/Paper/CVPR27_partseg')
BIN=Path('/apdcephfs_zwfy2/share_303204533/yiqun/texlive/2026/bin/x86_64-linux')
build=Path(tempfile.mkdtemp(prefix='flexpart-paper-',dir='/apdcephfs_zwfy2/share_303204533/yiqun/tmp'))
for name in ['figures','sec','tables']:
    shutil.copytree(SOURCE/name,build/name)
for file in SOURCE.iterdir():
    if file.suffix in ['.tex','.bib','.bst','.sty','.bbl']:shutil.copy2(file,build/file.name)
env=os.environ.copy();env['PATH']=str(BIN)+os.pathsep+env['PATH']
for i in range(3):
    with (build/f'build-{i}.log').open('w') as log:
        p=subprocess.run([str(BIN/'pdflatex'),'-interaction=nonstopmode','-halt-on-error','main.tex'],cwd=build,env=env,stdout=log,stderr=subprocess.STDOUT)
    if p.returncode:
        print((build/f'build-{i}.log').read_text()[-4500:]);raise SystemExit(p.returncode)
doc=fitz.open(build/'main.pdf')
assert len(doc)>0 and 'FlexPart' in doc[0].get_text()
shutil.copy2(build/'main.pdf',ROOT/'assets/paper.pdf')
print('paper pages',len(doc),'build',build,flush=True)
