"""Rebuild the revised film and website in-place with bounded parallelism."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[1]
LOGS=ROOT/'review/render-typography'
LOGS.mkdir(parents=True,exist_ok=True)
segments=[(0,84,'final-method.mp4'),(84,94,'final-asset1.mp4'),(94,104,'final-asset2.mp4'),(104,114,'final-asset3.mp4'),(114,124,'final-asset4.mp4'),(124,138,'final-ending.mp4')]
def render(job):
    start,end,name=job
    with (LOGS/(name+'.log')).open('w') as log:
        subprocess.run(['bash','scripts/run-render.sh','film',str(start),str(end),name],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,check=True)
    return name
with ThreadPoolExecutor(max_workers=3) as pool:
    futures=[pool.submit(render,j) for j in segments]
    for f in as_completed(futures):print('rendered',f.result(),flush=True)
for mode in ['static','assemble','webm','package']:
    print('finalize',mode,flush=True)
    subprocess.run([sys.executable,'scripts/finalize.py',mode],cwd=ROOT,check=True)
subprocess.run(['bash','scripts/run-render.sh','site'],cwd=ROOT,check=True)
print('COMPLETE: 138-second film, five paper figures, homepage and deployment ZIP',flush=True)
