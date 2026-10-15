"""Extract exact main-paper figures for the project homepage."""
import json
from pathlib import Path
import fitz
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
PAPER=Path('/apdcephfs_cq12/share_360969/yiqun/Paper/CVPR27_partseg')
OUT=ROOT/'assets'
records=[]
def export(page,rect,name,source,scale=5):
    pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),clip=fitz.Rect(rect),alpha=False)
    im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    im.save(OUT/(name+'.webp'),quality=94,method=6)
    records.append({'asset':name+'.webp','source':str(source),'page':page.number+1,'crop_points':list(rect),'pixels':list(im.size)})
    print(name,im.size,flush=True)
d=fitz.open(PAPER/'figures/pipelinev3.pdf')
export(d[0],d[0].rect,'method-pipeline',PAPER/'figures/pipelinev3.pdf',4)
paper=ROOT/'assets/paper.pdf'
d=fitz.open(paper)
export(d[5],(56,62,557,269),'results-tiny',paper)
export(d[5],(56,325,557,565),'results-granularity',paper)
export(d[7],(57,61,387,193),'results-selective',paper,7)
export(d[7],(391,61,557,189),'results-ablation',paper,7)
(OUT/'paper-figures.json').write_text(json.dumps(records,indent=2)+'\n')
