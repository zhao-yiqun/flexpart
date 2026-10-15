import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ffmpeg='/apdcephfs_zwfy2/share_303204533/yiqun/miniconda3/envs/segvigen/lib/python3.10/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.svg':'image/svg+xml','.vtt':'text/vtt','.pdf':'application/pdf'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+'/')&&path!==root)throw Error('outside root');const f=(await stat(path)).isDirectory()?resolve(path,'index.html'):path;const data=await readFile(f);res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));}else{res.setHeader('Content-Length',data.length);res.end(data);}}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars'],executablePath:process.env.CHROMIUM_PATH});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
page.on('pageerror',e=>console.error('PAGE ERROR',e.message));
await page.goto(`http://127.0.0.1:${port}/film.html`);await page.waitForFunction(()=>window.filmReady,null,{timeout:120000});
const output=resolve(root,'assets');await mkdir(resolve(root,'review'),{recursive:true});
const mode=process.argv[2]||'preview';
try{
  if(mode==='preview'){
    await page.evaluate(()=>window.prepareAssets([1,2,3,4]));
    console.log('font verification',await page.evaluate(()=>({loaded:window.fontsVerified,faces:[...document.fonts].map(f=>({family:f.family,status:f.status}))})));
    for(const t of [2.5,8,13,28,46,54,60,67,73,78,82,84,87,94,97,104,107,114,117,127,130,131,132,136]){await page.evaluate(t=>window.renderFrame(t),t);await page.screenshot({path:resolve(root,`review/frame-${String(t).replace('.','_')}.png`)});console.log('preview',t);}
  }else if(mode==='film'){
    const fps=30,start=Number(process.argv[3]||0),end=Number(process.argv[4]||138),target=process.argv[5]||'flexpart-film.mp4';
    const assets=[1,2,3,4].filter(n=>end>84+(n-1)*10&&start<84+n*10);
    if(assets.length)await page.evaluate(ns=>window.prepareAssets(ns),assets);
    const enc=spawn(ffmpeg,['-y','-loglevel','warning','-f','image2pipe','-vcodec','mjpeg','-r',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','18','-threads','6','-pix_fmt','yuv420p','-movflags','+faststart',resolve(output,target)],{stdio:['pipe','inherit','inherit']});
    for(let i=Math.round(start*fps);i<Math.round(end*fps);i++){const data=await page.evaluate(async t=>{await window.renderFrame(t);return document.querySelector('#film').toDataURL('image/jpeg',.96).split(',')[1];},i/fps);const frame=Buffer.from(data,'base64');if(!enc.stdin.write(frame))await once(enc.stdin,'drain');if(i%150===0)console.log('rendered',i/fps,'seconds');}
    enc.stdin.end();const [code]=await once(enc,'exit');if(code!==0)throw Error(`ffmpeg exited ${code}`);
  }else if(mode==='site'){
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(`http://127.0.0.1:${port}/`);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(im=>{im.loading='eager';return im.decode();}));});await page.waitForFunction(()=>Number.isFinite(document.querySelector('#overview-film').duration));await page.screenshot({path:resolve(root,'review/homepage-desktop.png'),fullPage:true});
    const research=await page.locator('.research-figure img').evaluateAll(ims=>ims.map(im=>({src:im.getAttribute('src'),loaded:im.complete&&im.naturalWidth>0})));if(research.length!==5||research.some(r=>!r.loaded))throw Error('Missing paper figures');
    await page.locator('#method').screenshot({path:resolve(root,'review/homepage-method.png')});await page.locator('#results').screenshot({path:resolve(root,'review/homepage-results.png')});
    const duration=await page.locator('#overview-film').evaluate(v=>v.duration);if(Math.abs(duration-138)>.1)throw Error(`Unexpected duration ${duration}`);
    await page.locator('#tab-multi').click();if(!await page.locator('#panel-multi').isVisible())throw Error('Multi tab failed');await page.locator('#tab-multi').press('ArrowRight');if(!await page.locator('#panel-selective').isVisible())throw Error('Keyboard tabs failed');
    await page.locator('[data-seek="84"]').click();await page.waitForFunction(()=>document.querySelector('#overview-film').currentTime>=84);await page.locator('#overview-film').evaluate(v=>v.pause());
    await page.locator('#rotation-toggle').click();await page.waitForFunction(()=>[...document.querySelectorAll('.turntable')].every(v=>v.currentTime>.1&&!v.paused));const loops=await page.locator('.turntable').evaluateAll(vs=>vs.map(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight})));if(loops.some(v=>Math.abs(v.duration-10)>.1))throw Error('Loop duration mismatch');await page.locator('#rotation-toggle').click();await page.locator('#tab-manual').click();
    const links=await page.evaluate(()=>[...document.querySelectorAll('a[href],source[src],track[src],img[src]')].map(e=>e.getAttribute('href')||e.getAttribute('src')).filter(s=>s&&!s.startsWith('#')&&!s.startsWith('http')));
    for(const link of new Set(links)){const response=await page.request.get(`http://127.0.0.1:${port}/${link}`);if(!response.ok())throw Error(`Broken link ${link}`);}
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.querySelector('#overview-film').currentTime=0;window.scrollTo(0,0);});await page.screenshot({path:resolve(root,'review/homepage-mobile.png'),fullPage:true});
    const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,missing:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)}));if(dimensions.scroll!==dimensions.width||dimensions.missing.length||errors.length)throw Error(JSON.stringify({dimensions,errors}));
    const fonts=await page.evaluate(()=>({Manrope:document.fonts.check('500 32px Manrope'),Inter:document.fonts.check('400 20px Inter')}));if(!fonts.Manrope||!fonts.Inter)throw Error('Homepage fonts missing');
    const report={duration,fonts,research,loops,dimensions,errors,checks:['desktop and mobile visual snapshots','five main-paper figures loaded','mode tabs and arrow-key navigation','video chapter seek','four loops play and pause','all local links resolve']};await writeFile(resolve(root,'verification.json'),JSON.stringify(report,null,2));console.log(report);
  }
}finally{await browser.close();server.close();}
