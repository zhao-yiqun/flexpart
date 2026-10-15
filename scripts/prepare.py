"""Extract the current paper artwork; retain a precise source manifest."""
import json
import hashlib
import shutil
from pathlib import Path
import fitz
from PIL import Image, ImageOps, ImageDraw

W = Path('/apdcephfs_zwfy2/share_303204533/yiqun')
PAPER = Path('/apdcephfs_cq12/share_360969/yiqun/Paper/CVPR27_partseg')
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
ASSETS.mkdir(exist_ok=True)
TEASER = W / 'paper_teaser_renders_20260903/ppt'

def main():
    records = []
    for name in ['a_mesh','a_parts','b_coarse','b_middle','b_fine','b_views','c_out','c_views']:
        src = TEASER / f'{name}.png'
        im = Image.open(src).convert('RGBA')
        bbox = im.getchannel('A').getbbox()
        if bbox:
            im = im.crop(bbox)
        im.save(ASSETS / f'{name}.png')
        records.append({'asset':f'{name}.png','source':str(src),'sha256':hashlib.sha256(src.read_bytes()).hexdigest()})
    doc = fitz.open(PAPER / 'figures/teaserv4.pdf')
    page = doc[0]
    page.get_pixmap(matrix=fitz.Matrix(3,3), alpha=False).save(str(ASSETS/'teaser.png'))
    # Use the embedded images from v4 itself, including its newer kart camera.
    for name,xref in {'a_mesh':17,'a_parts':13,'b_coarse':14,'b_middle':15,'b_fine':16,'c_out':22,'b_views':23,'c_views':24}.items():
        pm=fitz.Pixmap(doc,xref)
        smask=doc.extract_image(xref).get('smask',0)
        if smask: pm=fitz.Pixmap(pm,fitz.Pixmap(doc,smask))
        im=Image.frombytes('RGBA' if pm.alpha else 'RGB',(pm.width,pm.height),pm.samples).convert('RGBA')
        # Full square images have embedded white: crop to visible content.
        import numpy as np
        arr=np.asarray(im)
        mask=(arr[:,:,:3].min(2)<248)&(arr[:,:,3]>30)
        yy,xx=np.where(mask)
        if len(xx): im=im.crop((max(0,int(xx.min())-6),max(0,int(yy.min())-6),min(im.width,int(xx.max())+7),min(im.height,int(yy.max())+7)))
        im.save(ASSETS/f'{name}.png')
        records.append({'asset':f'{name}.png','authoritative_source':str(PAPER/'figures/teaserv4.pdf'),'pdf_xref':xref})
    (ROOT/'teaser-text.txt').write_text(page.get_text())
    print('TEASER',page.rect, page.get_text())
    cases = json.loads((PAPER/'figures/7_aigc/SOURCE.json').read_text())
    for index,case in enumerate(cases['cases']):
        for short, level in [('c','coarse'),('m','middle'),('f','fine')]:
            src = PAPER / f'figures/7_aigc/{case["uid"]}/{short}.png'
            im=Image.open(src).convert('RGBA')
            bbox=im.getchannel('A').point(lambda x:255 if x>40 else 0).getbbox()
            if bbox: im=im.crop(bbox)
            im.save(ASSETS / f'asset{index+1}-{level}.png')
            manifest=W/'figure_assets/Fig7_aigc'/case['batch']/'renders'/case['uid']/level/'manifest.json'
            if manifest.exists():
                data=json.loads(manifest.read_text())
            else:
                manifest=W/'figure_assets/Fig7_aigc'/case['batch']/'SOURCE_MANIFEST.json'
                data=next(x for x in json.loads(manifest.read_text())['inputs'] if x['uid']==case['uid'] and x['level']==level)
            records.append({'asset':f'asset{index+1}-{level}.png','source':str(src),'render_manifest':str(manifest),'mesh':data['source'],'uid':case['uid'],'level':level,'camera':case['camera']})
    (ROOT/'source-manifest.json').write_text(json.dumps({'paper':str(PAPER),'title':'FlexPart: Text-Controlled Semantics-Aware 3D Part Segmentation at Flexible Granularity','teaser':str(PAPER/'figures/teaserv4.pdf'),'assets':records},indent=2)+'\n')
    contact=Image.new('RGB',(1400,1100),'white')
    for i,name in enumerate(['a_mesh','a_parts','b_coarse','b_middle','b_fine','c_out']):
        im=Image.open(ASSETS/f'{name}.png').convert('RGBA'); im.thumbnail((420,380))
        contact.paste(im,(i%3*460+20,i//3*430+50),im)
        ImageDraw.Draw(contact).text((i%3*460+20,i//3*430+20),name,fill='black')
    contact.save(ROOT/'contact-sheet.png')
    for i in range(4):
        im=Image.open(ASSETS/f'asset{i+1}-fine.png').convert('RGBA'); im.thumbnail((300,400))
        if i==0: contact2=Image.new('RGB',(1280,440),'white')
        contact2.paste(im,(i*320+(320-im.width)//2,20),im)
    contact2.save(ROOT/'aigc-contact.png')

if __name__=='__main__': main()
