import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Every animation is a pure function of time. This is both the editable source
// and the deterministic offline renderer; there is no screen-recording jitter.
const canvas=document.querySelector('#film'), ctx=canvas.getContext('2d');
const W=1920,H=1080;
const C={ink:'#202725',muted:'#69736e',green:'#376b54',line:'#e4e8e4',soft:'#f5f7f4',blue:'#2e6da4',orange:'#bd742e',purple:'#8c66a4'};
const imgs={};
await Promise.all(['a_mesh','a_parts','b_coarse','b_middle','b_fine','b_views','c_views','c_out','teaser',...Array.from({length:4},(_,i)=>['coarse','middle','fine'].map(l=>`asset${i+1}-${l}`)).flat()].map(async n=>{const im=new Image();im.src=`assets/${n}.png`;await im.decode();imgs[n]=im;}));
// Load local font files explicitly before Canvas draws; system fallbacks used
// to make the exported movie look different from the intended typography.
await Promise.all([['Manrope','Manrope-Variable.ttf'],['Inter','Inter-Variable.ttf']].map(async([name,file])=>{
    const face=new FontFace(name,`url(assets/fonts/${file})`,{weight:'100 900',style:'normal'});
    document.fonts.add(await face.load());
}));
await document.fonts.ready;
window.fontsVerified=['Manrope','Inter'].every(name=>document.fonts.check(`500 32px ${name}`));
if(!window.fontsVerified)throw new Error('Required film fonts did not load');
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const enter=(t,start,d=.8)=>ease((t-start)/d);
const mix=(a,b,t)=>a+(b-a)*t;
const font=(size=30,weight=400,display=false)=>`${display&&weight===400?500:weight} ${size}px "${display||size>=40?'Manrope':'Inter'}"`;
function text(s,x,y,size=30,color=C.ink,weight=400,align='left',display=false){ctx.font=font(size,weight,display);ctx.letterSpacing=size>=40?`${-size*.025}px`:'0px';ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(s,x,y);ctx.letterSpacing='0px';}
function lines(str,x,y,width,size=28,lineHeight=40,color=C.ink,weight=400){let yy=y;ctx.font=font(size,weight);for(const para of str.split('\n')){let row='';for(const word of para.split(' ')){const test=row?`${row} ${word}`:word;if(ctx.measureText(test).width>width&&row){text(row,x,yy,size,color,weight);yy+=lineHeight;row=word;}else row=test;}text(row,x,yy,size,color,weight);yy+=lineHeight;}return yy;}
function rect(x,y,w,h,r=20,fill='white',stroke=null){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function image(n,x,y,w,h,alpha=1){if(alpha<=0)return;const im=imgs[n];const s=Math.min(w/im.width,h/im.height),iw=im.width*s,ih=im.height*s;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(im,x+(w-iw)/2,y+(h-ih)/2,iw,ih);ctx.restore();}
function fade(alpha,fn,dy=0){if(alpha<=0)return;ctx.save();ctx.globalAlpha*=alpha;ctx.translate(0,dy);fn();ctx.restore();}
function chip(s,x,y,w=190,color=C.green,fill='#eef4ef'){rect(x,y,w,48,24,fill);text(s,x+w/2,y+32,21,color,600,'center');}
function arrow(x1,y1,x2,y2,p=1,color='#98a49e'){if(p<=0)return;const x=mix(x1,x2,p),y=mix(y1,y2,p);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x,y);ctx.stroke();const a=Math.atan2(y2-y1,x2-x1);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-16*Math.cos(a-.48),y-16*Math.sin(a-.48));ctx.lineTo(x-16*Math.cos(a+.48),y-16*Math.sin(a+.48));ctx.closePath();ctx.fill();}
function rule(y=950){ctx.strokeStyle=C.line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(92,y);ctx.lineTo(1828,y);ctx.stroke();}
function brand(){text('FlexPart',94,72,27,C.ink,650,'left',true);ctx.font=font(27,650,true);const width=ctx.measureText('FlexPart').width;ctx.fillStyle=C.green;ctx.beginPath();ctx.arc(94+width+12,64,3.5,0,7);ctx.fill();}
function heading(kicker,title,sub){brand();text(kicker.toUpperCase(),96,144,18,C.green,600);text(title,96,222,56,C.ink,500,'left',true);if(sub)text(sub,98,271,25,C.muted);}
function subtitle(s){rule();text(s,960,1005,27,C.ink,400,'center');}
function model(x,y,w=214,h=106){rect(x,y,w,h,20,'#eef4ef','#c9d9cb');text('FlexPart',x+w/2,y+45,30,C.green,700,'center');text('one model',x+w/2,y+76,20,C.muted,400,'center');}
function prompt(x,y,w,h,title,body,accent=C.green){rect(x,y,w,h,18,'#fdfaf3','#e3d5bc');text(title,x+26,y+44,25,accent,600);lines(body,x+26,y+89,w-52,25,38);}
function progress(t){}

function intro(t){const p=enter(t,0,.9);fade(p,()=>{text('FlexPart',960,390,104,C.ink,600,'center');text('Text-controlled 3D part segmentation',960,473,42,C.muted,400,'center',true);});fade(enter(t,.8),()=>{['Name the parts','Choose the granularity','Select what matters'].forEach((s,i)=>chip(s,430+i*365,574,330));});}

// These three panels are rendered first in close-up, then physically move into
// the same top-left / bottom-left / right-column arrangement as teaser v4.
function manualPanel(t,mini=false){
    const a=enter(t,.1),b=enter(t,1.9),m=enter(t,4.7),o=enter(t,5.8,1.15);
    fade(a,()=>{image('a_mesh',90,80,370,445);text('Input 1 · 3D geometry',275,560,25,C.muted,500,'center');},(1-a)*20);
    fade(b,()=>{text('+',488,295,54,C.muted,400,'center');prompt(534,114,514,328,'Input 2 · Control prompt','An off-road kart with 14 parts\n1. seat  <location>  <shape>\n2. axle  <location>  <shape>\n3. roll cage  <location>  <shape>\n…');text('Name + location + shape',791,485,23,C.muted,400,'center');},(1-b)*20);
    fade(m,()=>{arrow(1070,295,1130,295);model(1150,245,210,104);arrow(1380,295,1440,295);});
    fade(o,()=>{image('a_parts',1450,80,370,445);text('14-part segmentation',1635,560,25,C.green,600,'center');},(1-o)*20);
}
function manual(t){heading('01 / user-guided segmentation','Tell the model which parts you want.','A geometry and an ordered description define the desired partition.');ctx.save();ctx.translate(0,300);manualPanel(t);ctx.restore();subtitle(t<5?'First, provide a 3D mesh and a control prompt.':'FlexPart assigns part identities directly to the mesh.');}

function multiPanel(t){
    const a=enter(t,.1),b=enter(t,1.9),p=enter(t,3.6),outs=[enter(t,5.1),enter(t,7.1),enter(t,9.1)];
    fade(a,()=>{image('b_views',45,87,305,360);text('Input 1 · Mesh views',197,494,24,C.muted,500,'center');});
    fade(b,()=>{prompt(370,100,318,200,'Input 2 · Request','“Segment at coarse,\nmedium and fine levels.”');});
    fade(p,()=>{arrow(328,340,356,418);arrow(470,320,470,350);rect(366,367,230,104,18,'#fdfaf3','#d9ceb8');text('Visual planner',481,410,26,C.ink,600,'center');text('Qwen-VL',481,445,22,C.muted,400,'center');arrow(614,418,690,418);model(708,367,210,104);text('writes prompts',757,342,20,C.muted,400,'center');arrow(920,418,968,418);});
    for(let i=0;i<3;i++)fade(outs[i],()=>{const x=970+i*306;chip(['Coarse · 5 parts','Medium · 9 parts','Fine · 15 parts'][i],x+10,40,268,[C.blue,C.orange,C.green][i],['#e7f0f8','#fbefdf','#e7f2e8'][i]);text(['left arm, …','left boot, …','left hand, …'][i],x+144,126,23,C.muted,400,'center');image(['b_coarse','b_middle','b_fine'][i],x+5,157,286,377);});
    fade(enter(t,10.4),()=>text('Same geometry. Different prompts.',1390,578,27,C.green,500,'center'));
}
function multi(t){heading('02 / automatic three-level segmentation','Choose how finely to divide.','The visual planner writes three prompts; FlexPart follows each one.');ctx.save();ctx.translate(0,306);multiPanel(t);ctx.restore();subtitle(t<4.7?'Mesh views and a granularity request go to the visual planner.':'Coarse, medium and fine partitions come from the same segmentation model.');}

function selectivePanel(t){
    const a=enter(t,.1),b=enter(t,1.7),p=enter(t,3.3),m=enter(t,5.1),o=enter(t,6.3,1.2);
    fade(a,()=>{image('c_views',42,122,277,335);text('Input 1 · Mesh views',181,510,22,C.muted,500,'center');});
    fade(b,()=>{prompt(344,60,442,154,'Input 2 · User request','“Segment the two swords and the hands.”',C.blue);});
    fade(p,()=>{arrow(322,293,362,293);arrow(493,217,493,238);rect(381,242,226,98,18,'#fdfaf3','#d9ceb8');text('Visual planner',494,285,26,C.ink,600,'center');text('Qwen-VL',494,317,21,C.muted,400,'center');arrow(637,288,698,288);prompt(725,214,500,339,'Planned control prompt','1. sword on the back\n2. sword in the hand\n3. left hand\n4. right hand\nAll remaining parts: background.');});
    fade(m,()=>{arrow(1245,359,1292,359);model(1310,308,207,104);arrow(1535,359,1570,359);});
    fade(o,()=>{image('c_out',1584,66,262,503);text('Selected parts',1715,608,26,C.green,600,'center');});
}
function selective(t){heading('03 / selective part segmentation','Ask for just the parts you need.','The prompt explicitly places all remaining parts in the background.');ctx.save();ctx.translate(0,280);selectivePanel(t);ctx.restore();subtitle(t<5?'“Segment the two swords and the hands.”':'The requested parts receive distinct labels; the rest becomes background.');}

function promptSwap(t){
    heading('the control mechanism','Change the prompt. Change the partition.','The input geometry and the FlexPart model stay the same.');
    const index=Math.min(2,Math.floor(t/6)),local=t-index*6,outputAlpha=enter(local,1.05,1.0);
    const levels=['Coarse','Medium','Fine'],colors=[C.blue,C.orange,C.green],counts=[5,9,15];
    image('b_views',78,362,337,424);chip('Same geometry',128,827,233,C.muted,'#f1f3f1');
    const px=472,py=358,pw=504;
    rect(px,py,pw,414,20,'#fdfaf3','#e3d5bc');
    chip(`${levels[index]} prompt`,px+30,py+25,230,colors[index],['#e7f0f8','#fbefdf','#e7f2e8'][index]);
    lines(`This object contains ${counts[index]} parts.`,px+31,py+135,pw-60,29,43);
    lines(['1. left arm  <location>  <shape>\n…','1. left boot  <location>  <shape>\n…','1. left hand  <location>  <shape>\n…'][index],px+31,py+222,pw-60,27,47);
    text('The planned item list changes.',px+31,py+370,23,colors[index],500);
    arrow(995,550,1045,550);model(1061,497,224,106);arrow(1305,550,1355,550);
    chip('Same model',1064,641,220,C.muted,'#f1f3f1');
    if(index>0)image(['b_coarse','b_middle'][index-1],1385,348,414,466,1-outputAlpha);
    image(['b_coarse','b_middle','b_fine'][index],1385,348,414,466,outputAlpha);
    fade(outputAlpha,()=>{text(`${levels[index]} partition · ${counts[index]} parts`,1592,860,27,colors[index],600,'center');});
    subtitle('Only the text changes: the requested part list determines the output granularity.');
}

function merge(t){
    heading('one unified framework','All in one model.','User-guided, multi-granularity and selective segmentation — controlled by text.');
    const p=ease(t/2.7), final=[{x:64,y:344,w:1240,h:244},{x:64,y:623,w:1240,h:267},{x:1340,y:344,w:516,h:546}];
    // Teaser panels come together as the exact paper artwork; the individual
    // crops align pixel-for-pixel at the end of the move.
    const im=imgs.teaser, sx=im.width/688.05, sy=im.height/276.88;
    const crops=[[0,0,481,123],[0,123,481,153.88],[481,0,207.05,276.88]];
    const full={x:190,y:306,w:1540,h:619.6};
    const starts=[{x:-100,y:300,w:1540,h:393.8},{x:30,y:1000,w:1520,h:486.4},{x:1600,y:310,w:760,h:1016.6}];
    crops.forEach((c,i)=>{const dest={x:full.x+c[0]/688.05*full.w,y:full.y+c[1]/276.88*full.h,w:c[2]/688.05*full.w,h:c[3]/276.88*full.h};const st=starts[i];ctx.save();ctx.globalAlpha=.3+.7*p;ctx.drawImage(im,c[0]*sx,c[1]*sy,c[2]*sx,c[3]*sy,mix(st.x,dest.x,p),mix(st.y,dest.y,p),mix(st.w,dest.w,p),mix(st.h,dest.h,p));ctx.restore();});
    // Leave clear space above and below the paper layout.
    ctx.fillStyle='white';ctx.fillRect(0,0,W,302);brand();text('ONE UNIFIED FRAMEWORK',96,144,20,C.green,600);text('All in one model.',96,222,54,C.ink,400,'left',true);
    subtitle('One FlexPart model. Different text prompts. The partition you ask for.');
}

let renderer,loader;const meshCache=new Map();
function setupRenderer(){if(renderer)return;renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(580,388);renderer.setClearColor(0xffffff,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;loader=new GLTFLoader();}
async function loadMesh(asset,level){const key=`${asset}-${level}`;if(meshCache.has(key))return;setupRenderer();const gltf=await loader.loadAsync(`assets/models/asset${asset}-${level}.glb`);const root=gltf.scene;root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());const scale=2/Math.max(size.x,size.y,size.z);root.position.sub(center);const pivot=new THREE.Group();pivot.add(root);pivot.scale.setScalar(scale);
    root.traverse(o=>{if(o.isMesh){if(!o.geometry.attributes.normal)o.geometry.computeVertexNormals();const colors=o.geometry.attributes.color;if(colors){for(let i=0;i<colors.count;i++){const col=new THREE.Color(colors.getX(i),colors.getY(i),colors.getZ(i));col.convertSRGBToLinear();colors.setXYZ(i,col.r,col.g,col.b);}colors.needsUpdate=true;}o.material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:!!colors,metalness:0,roughness:.82,side:THREE.DoubleSide});o.castShadow=true;o.receiveShadow=true;}});
    const scene=new THREE.Scene();scene.add(pivot);scene.add(new THREE.AmbientLight(0xffffff,.95));const hemi=new THREE.HemisphereLight(0xf4f7ff,0x9b9188,.75);scene.add(hemi);for(const [pos,power] of [[[3,5,4],2.4],[[-4,2,1],.75],[[0,3,-4],.9]]){const l=new THREE.DirectionalLight(0xffffff,power);l.position.set(...pos);scene.add(l);}
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d'),sg=sc.createRadialGradient(64,64,4,64,64,64);sg.addColorStop(0,'rgba(30,38,32,.30)');sg.addColorStop(1,'rgba(30,38,32,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,128);const plane=new THREE.Mesh(new THREE.PlaneGeometry(2.7,2.7),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.y=-size.y*scale/2-.025;scene.add(plane);
    const camera=new THREE.PerspectiveCamera(29,580/388,.01,100);camera.position.set(0,2.1,5.2);camera.lookAt(0,0,0);meshCache.set(key,{scene,pivot,camera,height:size.y*scale});
}
window.prepareAssets=async assets=>{for(const n of assets)for(const l of ['coarse','middle','fine'])await loadMesh(n,l);};
function renderMesh(n,level,angle,x,y,w,h){const m=meshCache.get(`${n}-${level}`);if(!m)throw new Error(`Mesh not loaded: ${n}-${level}`);const az=initial[n-1]*Math.PI/180,el=25*Math.PI/180;const radius=5.4;
    // Camera and studio lights are fixed; the entire normalized model rotates
    // around its own center. The three granularities use exactly the same angle.
    m.pivot.rotation.y=-(angle-initial[n-1])*Math.PI/180;
    m.camera.aspect=w/h;m.camera.position.set(radius*Math.sin(az)*Math.cos(el),radius*Math.sin(el),radius*Math.cos(az)*Math.cos(el));m.camera.lookAt(0,0,0);m.camera.updateProjectionMatrix();
    // A soft contact ellipse, with no baked image used for the rotation.
    ctx.save();const shadow=ctx.createRadialGradient(x+w/2,y+h*.87,1,x+w/2,y+h*.87,w*.28);shadow.addColorStop(0,'rgba(37,45,40,.16)');shadow.addColorStop(1,'rgba(37,45,40,0)');ctx.translate(0,y+h*.87);ctx.scale(1,.20);ctx.fillStyle=shadow;ctx.restore();
    renderer.setSize(Math.round(w),Math.round(h),false);renderer.render(m.scene,m.camera);ctx.drawImage(renderer.domElement,x,y,w,h);
}
function genIntro(t){brand();fade(enter(t,.1),()=>{text('BEYOND ARTIST-MADE MESHES',960,338,21,C.green,600,'center');text('Generalization to AIGC assets',960,424,64,C.ink,400,'center',true);text('Four generated assets. Three levels of detail.',960,497,31,C.muted,400,'center');});fade(enter(t,.8),()=>{for(let i=0;i<4;i++)image(`asset${i+1}-fine`,348+i*313,568,280,310);});}
const names=['Tracked machine','Sci-fi blaster','Armored character','Winged robot'];
const initial=[60,0,30,330];
function turntables(t,assets){heading('04 / generalization to AIGC assets','One asset. Three granularities.','Change the planned prompt to reveal broad groups or fine semantic parts.');
    const levels=['coarse','middle','fine'];assets.forEach((n,row)=>{const yy=324+row*305;text(names[n-1],105,yy+153,24,C.muted,500);levels.forEach((l,i)=>{const x=392+i*480;chip(['Coarse','Medium','Fine'][i],x+154,yy-20,166,[C.blue,C.orange,C.green][i],['#e7f0f8','#fbefdf','#e7f2e8'][i]);renderMesh(n,l,initial[n-1]+360*t/18,x,yy+22,458,257);});});subtitle('The three granularities rotate together, showing a consistent 3D partition.');}
function singleAsset(t,n){heading(`generalization to AIGC assets · ${n} / 4`,names[n-1],'AI-generated geometry · Three planned prompts · The same FlexPart framework');
    ['coarse','middle','fine'].forEach((l,i)=>{const x=72+i*604;chip(['Coarse prompt','Medium prompt','Fine prompt'][i],x+165,330,270,[C.blue,C.orange,C.green][i],['#e7f0f8','#fbefdf','#e7f2e8'][i]);renderMesh(n,l,initial[n-1]+360*t/10,x,401,568,480);});
    subtitle('Prompt-controlled granularity generalizes to AI-generated meshes.');
}
function allAssets(t){heading('generalization to generated assets','Flexible control, across different shapes.','The four AIGC examples from the paper.');for(let a=0;a<4;a++){const x=100+(a%2)*890,y=330+Math.floor(a/2)*302;text(names[a],x+405,y-9,24,C.muted,500,'center');['coarse','middle','fine'].forEach((l,i)=>{image(`asset${a+1}-${l}`,x+i*280,y+14,265,240);text(['Coarse','Medium','Fine'][i],x+i*280+132,y+278,21,[C.blue,C.orange,C.green][i],500,'center');});}subtitle('The input text determines both the granularity and the parts to extract.');}
function ending(t){fade(enter(t,0,.85),()=>{text('FlexPart',960,348,98,C.ink,650,'center',true);text('Text-Controlled Semantics-Aware',960,451,43,C.ink,500,'center',true);text('3D Part Segmentation at Flexible Granularity',960,512,43,C.ink,500,'center',true);text('what you ask for is what you get',960,630,29,C.green,450,'center');for(let i=0;i<3;i++)image(['a_parts','b_fine','c_out'][i],605+i*250,717,210,235);});}

window.renderFrame=async t=>{ctx.clearRect(0,0,W,H);ctx.fillStyle='white';ctx.fillRect(0,0,W,H);if(t<4)intro(t);else if(t<17)manual(t-4);else if(t<35)multi(t-17);else if(t<51)selective(t-35);else if(t<71)promptSwap(t-51);else if(t<79)merge(t-71);else if(t<84)genIntro(t-79);else if(t<124){const n=Math.floor((t-84)/10)+1;singleAsset(t-84-(n-1)*10,n);}else if(t<130)allAssets(t-124);else ending(t-130);};
window.filmReady=true;
await window.renderFrame(0);
