"""Assemble the film, derive web loops/posters, and build a portable site zip."""
import json
import shutil
import subprocess
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw
import imageio_ffmpeg

ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'assets'
FF=imageio_ffmpeg.get_ffmpeg_exe()
SEGMENTS=['final-method.mp4',*[f'final-asset{i}.mp4' for i in range(1,5)],'final-ending.mp4']

def run(args):
    subprocess.run([FF,'-y','-hide_banner','-loglevel','error',*args],check=True)

def stamp(t,sep='.'):
    return f'{t//3600:02d}:{t//60%60:02d}:{t%60:02d}{sep}000'

def prepare_static():
    Image.open(ROOT/'review/frame-78.png').convert('RGB').save(A/'film-poster.jpg',quality=94)
    for i,t in enumerate([84,94,104,114],1):
        im=Image.open(ROOT/f'review/frame-{t}.png').crop((72,395,1852,895)).convert('RGB')
        im.save(A/f'asset{i}-poster.jpg',quality=94)
    rows=[(0,4,'FlexPart: Text-controlled 3D part segmentation.'),(4,9,'First, provide a 3D mesh and a control prompt.'),(9,17,'FlexPart assigns part identities directly to the mesh.'),(17,22,'Mesh views and a granularity request go to the visual planner.'),(22,35,'Coarse, medium and fine partitions come from the same segmentation model.'),(35,40,'Segment the two swords and the hands.'),(40,51,'The requested parts receive distinct labels; the rest becomes background.'),(51,71,'Only the text changes: the requested part list determines the output granularity.'),(71,79,'One FlexPart model. Different text prompts. The partition you ask for.'),(79,84,'Generalization to AIGC assets: four generated assets, three levels of detail.'),(84,94,'Tracked machine: prompt-controlled granularity on AI-generated geometry.'),(94,104,'Sci-fi blaster: coarse, medium and fine partitions.'),(104,114,'Armored character: coarse, medium and fine partitions.'),(114,124,'Winged robot: coarse, medium and fine partitions.'),(124,130,'The input text determines both the granularity and the parts to extract.'),(130,134,'what you ask for is what you get'),(134,142,'FlexPart: Text-Controlled Semantics-Aware 3D Part Segmentation at Flexible Granularity')]
    (A/'captions-en.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{stamp(a)} --> {stamp(b)}\n{s}' for a,b,s in rows)+'\n')
    (A/'captions-en.srt').write_text('\n\n'.join(f'{i}\n{stamp(a,",")} --> {stamp(b,",")}\n{s}' for i,(a,b,s) in enumerate(rows,1))+'\n')
    # A compact review sheet without requiring a video player.
    frames=[13,28,46,54,60,67,78,84,94,104,114,140]
    sheet=Image.new('RGB',(1440,940),'#f5f7f4');draw=ImageDraw.Draw(sheet)
    for j,t in enumerate(frames):
        im=Image.open(ROOT/f'review/frame-{t}.png').convert('RGB');im.thumbnail((466,263))
        x=8+j%3*478;y=8+j//3*233
        im=im.resize((400,225));sheet.paste(im,(x,y));draw.text((x+407,y+12),f'{t}s',fill='#376b54')
    sheet.save(ROOT/'storyboard.jpg',quality=94)

def assemble():
    for section in ['method','ending']:
        target=A/f'final-{section}.mp4'
        if not target.exists():
            run(['-i',str(A/f'part-{section}.mp4'),'-vf','drawbox=x=0:y=1076:w=1920:h=4:color=white:t=fill','-an','-c:v','libx264','-preset','medium','-crf','18','-threads','4','-pix_fmt','yuv420p','-movflags','+faststart',str(target)])
    for f in SEGMENTS:
        assert (A/f).is_file(),f
    manifest=ROOT/'segments.ffconcat'
    manifest.write_text('ffconcat version 1.0\n'+''.join(f"file 'assets/{name}'\n" for name in SEGMENTS))
    run(['-f','concat','-safe','0','-i',str(manifest),'-c','copy','-movflags','+faststart',str(A/'flexpart-film.mp4')])
    for i in range(1,5):
        run(['-i',str(A/f'final-asset{i}.mp4'),'-vf','crop=1780:500:72:395,scale=1424:400','-an','-c:v','libx264','-preset','medium','-crf','20','-threads','4','-pix_fmt','yuv420p','-movflags','+faststart',str(A/f'asset{i}-turntable.mp4')])
    # Full-decode integrity check for all delivered MP4s.
    for f in [A/'flexpart-film.mp4',*[A/f'asset{i}-turntable.mp4' for i in range(1,5)]]:
        run(['-xerror','-i',str(f),'-f','null','-'])
        print('decoded',f.name,f.stat().st_size,flush=True)

def package():
    paths=[ROOT/x for x in ['index.html','style.css','site.js','favicon.svg']]
    paths.extend(p for p in A.iterdir() if p.is_file() and not p.name.startswith(('part-','final-')))
    with zipfile.ZipFile(ROOT/'flexpart-homepage.zip','w',zipfile.ZIP_DEFLATED,compresslevel=3) as z:
        for p in paths:z.write(p,p.relative_to(ROOT))
    print('site package', (ROOT/'flexpart-homepage.zip').stat().st_size,flush=True)

def webm():
    for stem in ['flexpart-film',*[f'asset{i}-turntable' for i in range(1,5)]]:
        run(['-i',str(A/f'{stem}.mp4'),'-an','-c:v','libvpx-vp9','-b:v','0','-crf','31','-row-mt','1','-cpu-used','4','-threads','6',str(A/f'{stem}.webm')])
        print('webm',stem,flush=True)

if __name__=='__main__':
    import sys
    mode=sys.argv[1] if len(sys.argv)>1 else 'all'
    if mode in ('static','all'):prepare_static()
    if mode in ('assemble','all'):assemble()
    if mode in ('webm','all'):webm()
    if mode in ('package','all'):package()
