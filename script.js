import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* DUBLIN DETAIL — scroll-directed real 3D studio.
   All three local .glb models are supplied with this site in the same folder. */
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = (n, a=0, b=1) => Math.min(b,Math.max(a,n));
const smoothstep = (a,b,x) => {const t=clamp((x-a)/(b-a)); return t*t*(3-2*t);};
const lerp = (a,b,t) => a+(b-a)*t;
const mobile = () => window.innerWidth < 760;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const chapterPoints = [0, .20, .40, .60, .80];
const frame = {scroll:0,target:0,time:0,loaded:0,chapter:-1,mouseX:0,mouseY:0,mouseTargetX:0,mouseTargetY:0};
const loadStatus = $('#loadState');
const loadFill = $('#loadFill');
const loadLabel = $('#loadLabel');
const hint = $('#scrollHint');
const chapterEls = $$('.chapter');
const buttonJump = $$('[data-jump]');
const navButtons = $$('.desktop-nav button');
const pins = [$('#pinWash'),$('#pinVacuum'),$('#pinPolish')];
const loader = new GLTFLoader();
const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color('#070a0d');
scene.fog = new THREE.FogExp2('#080b11',.019);
const camera = new THREE.PerspectiveCamera(mobile()?43:36,window.innerWidth/window.innerHeight,.1,100);
const canvas = $('#webgl');
let renderer;
try {
 renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 renderer.toneMapping = THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure = 1.5;
 renderer.shadowMap.enabled = !mobile();
 renderer.shadowMap.type = THREE.PCFSoftShadowMap;
} catch(err) {
 loadLabel.textContent='3D graphics could not start on this device';
 loadStatus.style.background='rgba(6,10,13,.85)';
 throw err;
}
function resize() {
 const w=innerWidth,h=innerHeight;
 camera.aspect=w/h; camera.fov=mobile()?43:36; camera.updateProjectionMatrix();
 renderer.setSize(w,h,false); renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile()?1.5:1.85));
 bgUniforms.uResolution.value.set(w,h);
}

// Dynamic, camera-locked liquid-steel backdrop, fading between cyan and amber.
const bgUniforms={uTime:{value:0},uScroll:{value:0},uResolution:{value:new THREE.Vector2(innerWidth,innerHeight)},uMouse:{value:new THREE.Vector2(0,0)}};
const background = new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShaderMaterial({
  uniforms:bgUniforms,depthWrite:false,depthTest:false,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`precision highp float;varying vec2 vUv;uniform float uTime,uScroll;uniform vec2 uResolution,uMouse;
    void main(){vec2 p=(gl_FragCoord.xy-.5*uResolution.xy)/uResolution.y;
    vec2 q=p;q.x+=.23*sin(p.y*1.8+uScroll*5.+uTime*.08);q.y+=.16*cos(p.x*2.5-uScroll*3.-uTime*.06);
    float a=sin(dot(q,vec2(.78,.62))*3.6+uTime*.17);float b=sin(dot(q,vec2(-.6,.8))*4.3-a*.7-uTime*.1);
    float w=.62*a+.38*b;float sheen=pow(max(0.,1.-abs(w-.2)),11.);
    float copper=smoothstep(.05,.96,uScroll);
    vec3 base=mix(vec3(.013,.023,.033),vec3(.027,.018,.014),copper);
    vec3 wave=mix(vec3(.028,.075,.100),vec3(.105,.053,.029),copper);
    vec3 spec=mix(vec3(.13,.27,.32),vec3(.27,.14,.07),copper);
    vec3 col=base+wave*smoothstep(-.55,.85,w)*.48+spec*sheen*.37;
    float spot=exp(-length((p-vec2(.1,.02))*vec2(.72,1.4))*.9);
    col+=mix(vec3(.018,.048,.06),vec3(.035,.018,.005),copper)*spot;
    col*=1.-.18*dot(p,p);gl_FragColor=vec4(col,1.);}`
}));
background.position.z=-15; background.renderOrder=-99;camera.add(background);scene.add(camera);

// A reflected strip-light studio: physically based reflections are generated
// locally, so it doesn't require an external HDR environment asset.
function buildEnvironment(){
 const envScene=new THREE.Scene();envScene.background=new THREE.Color('#101923');
 function panel(x,y,z,w,h,color,rotY=0){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(color),side:THREE.DoubleSide,toneMapped:false}));
  mesh.position.set(x,y,z);mesh.rotation.y=rotY;envScene.add(mesh);
 }
 panel(-3,3,3,1.5,8,'#ffffff',-.35);panel(2.8,4,1,1,9,'#bedbec',.28);
 panel(0,6,-2,9,1.5,'#b0c8d9',0);panel(-3,2,-2,1.4,7,'#ffe8c7',.75);
 panel(4,1.5,-3,1.2,8,'#fff7e5',-.5);panel(0,1,7,8,1,'#94b5d6');
 const pmrem=new THREE.PMREMGenerator(renderer);const rt=pmrem.fromScene(envScene,.045,.1,32);
 scene.environment=rt.texture;pmrem.dispose();envScene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
}
buildEnvironment();
const ambient=new THREE.HemisphereLight('#d7eaff','#14121b',1.9);scene.add(ambient);
const key=new THREE.SpotLight('#fff5e7',180,0,Math.PI/3,.9,1.5);key.position.set(3,8,5);key.castShadow=!mobile();key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0005;scene.add(key);scene.add(key.target);
const rim=new THREE.DirectionalLight('#b7eaff',6);rim.position.set(-4,4,-5);scene.add(rim);
const fill=new THREE.DirectionalLight('#eec19e',4);fill.position.set(3,2,-4);scene.add(fill);

// Low-slung display floor, with subtle reflection rings.
const floor=new THREE.Mesh(new THREE.CircleGeometry(7.8,96),new THREE.MeshStandardMaterial({color:'#171f29',metalness:.55,roughness:.35,transparent:true,opacity:.76}));floor.rotation.x=-Math.PI/2;floor.position.y=-.733;floor.receiveShadow=true;scene.add(floor);
const ringMat=new THREE.MeshBasicMaterial({color:'#93cad6',transparent:true,opacity:.26,depthWrite:false});
const ring=new THREE.Mesh(new THREE.TorusGeometry(3.18,.007,3,160),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=-.728;scene.add(ring);
const ring2=new THREE.Mesh(new THREE.TorusGeometry(4.15,.006,3,180),ringMat.clone());ring2.material.opacity=.09;ring2.rotation.x=Math.PI/2;ring2.position.y=-.73;scene.add(ring2);
const carRig=new THREE.Group();carRig.position.y=-.71;scene.add(carRig);
const vacuumRig=new THREE.Group();vacuumRig.position.set(-1.65,-.71,-1.65);scene.add(vacuumRig);vacuumRig.visible=false;
const dropletsRig=new THREE.Group();scene.add(dropletsRig);dropletsRig.visible=false;
const paintMaterials=[];
const colors={obsidian:{value:'#3e4c59',label:'OBSIDIAN'},silver:{value:'#c2d0d6',label:'LIQUID SILVER'},copper:{value:'#9f5840',label:'COPPER'}};
let currentPaint='obsidian';
function applyPaint(name){
 if(!colors[name])return;
 currentPaint=name;
 paintMaterials.forEach(m=>{m.color.set(colors[name].value);m.metalness=.85;m.roughness=.22;m.envMapIntensity=2.3;m.needsUpdate=true;});
 $$('.paint-swatch').forEach(el=>el.classList.toggle('is-selected',el.dataset.color===name));
 $('#swatchCaption').textContent=colors[name].label;
}
$$('.paint-swatch').forEach(el=>el.addEventListener('click',()=>applyPaint(el.dataset.color)));

// Fog-like water mist, real 3D droplets and a flowing parabolic wash jet.
function spriteTexture(){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');const g=ctx.createRadialGradient(32,32,1,32,32,31);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.23,'rgba(219,245,255,.9)');g.addColorStop(.7,'rgba(140,202,245,.22)');g.addColorStop(1,'rgba(140,202,245,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);}
const particleTexture=spriteTexture();
function makePoints(n,size,col,opacity){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));const material=new THREE.PointsMaterial({color:col,size,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,map:particleTexture,sizeAttenuation:true});const object=new THREE.Points(geometry,material);scene.add(object);return object;}
const waterCount=950;const water=makePoints(waterCount,.078,'#b3e5ff',0);water.frustumCulled=false;
const washSeeds=Array.from({length:waterCount},()=>({t:Math.random(),a:(Math.random()-.5),b:(Math.random()-.5),s:lerp(.5,1.4,Math.random())}));
function animateWater(time,alpha){const positions=water.geometry.attributes.position.array;for(let i=0;i<waterCount;i++){const d=washSeeds[i],u=(d.t+time*.42*d.s)%1,off=i*3;positions[off]=lerp(-3.35,1.15,u)+d.a*(.03+u*.43);positions[off+1]=lerp(2.8,-.29,u)+Math.sin(u*Math.PI)*.75+d.b*.12;positions[off+2]=lerp(2.2,.25,u)+d.b*(.05+u*.52);}water.geometry.attributes.position.needsUpdate=true;water.material.opacity=.83*alpha;water.visible=alpha>.015;dropletsRig.visible=alpha>.08;if(dropletsRig.visible){dropletsRig.rotation.y=Math.sin(time*.4)*.16;dropletsRig.position.set(.6+Math.sin(time*.8)*.12,-.07,.7);dropletsRig.scale.setScalar(.85+.15*Math.sin(time*1.1));}}
const dustCount=300;const dust=makePoints(dustCount,.034,'#e6f0ee',0);dust.frustumCulled=false;
const dustSeeds=Array.from({length:dustCount},()=>({t:Math.random(),a:(Math.random()-.5),b:(Math.random()-.5),s:lerp(.45,1.05,Math.random())}));
function animateDust(time,alpha){const arr=dust.geometry.attributes.position.array;const start=new THREE.Vector3(-.2,-.1,-.15);const end=new THREE.Vector3(-1.55,.4,-1.6);for(let i=0;i<dustCount;i++){const d=dustSeeds[i],t=(d.t+time*.31*d.s)%1,k=i*3;arr[k]=lerp(start.x,end.x,t)+d.a*.66*(1-t);arr[k+1]=lerp(start.y,end.y,t)+Math.sin(t*Math.PI)*.35+d.b*.35*(1-t);arr[k+2]=lerp(start.z,end.z,t)+d.b*.8*(1-t);}dust.geometry.attributes.position.needsUpdate=true;dust.material.opacity=.56*alpha;dust.visible=alpha>.02;}
const polishCount=145;const polish=makePoints(polishCount,.06,'#f5e8d0',0);polish.frustumCulled=false;
const polishSeeds=Array.from({length:polishCount},(_,i)=>({angle:Math.random()*Math.PI*2,rad:Math.random()*2.5,y:Math.random()*1.5,phase:i*11.9}));
function animatePolish(time,alpha){const arr=polish.geometry.attributes.position.array;for(let i=0;i<polishCount;i++){const d=polishSeeds[i],k=i*3,a=d.angle+time*.16;arr[k]=Math.cos(a)*d.rad;arr[k+1]=-.4+d.y+Math.sin(time*1.2+d.phase)*.12;arr[k+2]=Math.sin(a)*1.25;}polish.geometry.attributes.position.needsUpdate=true;polish.material.opacity=.65*alpha;polish.visible=alpha>.02;}

function normalizeModel(model,targetMax,container,ground=true){
 model.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(model),s=b.getSize(new THREE.Vector3());
 model.scale.multiplyScalar(targetMax/Math.max(s.x,s.y,s.z,.0001));model.updateMatrixWorld(true);
 b=new THREE.Box3().setFromObject(model);const c=b.getCenter(new THREE.Vector3());
 model.position.x-=c.x;model.position.z-=c.z;model.position.y-=ground?b.min.y:c.y;
 container.add(model);
}
const modelCount=3;let modelLoaded=0;
function modelDone(){modelLoaded++;loadFill.style.width=`${Math.round(modelLoaded/modelCount*100)}%`;if(modelLoaded===modelCount){frame.loaded=1;loadLabel.textContent='Studio ready';setTimeout(()=>loadStatus.classList.add('is-done'),320);}}
function modelError(name,error){console.error('Failed to load',name,error);modelDone();}
loader.load('./generic-mid-engine-supercar.glb',(gltf)=>{
 const m=gltf.scene;
 m.traverse(node=>{if(!node.isMesh)return;node.castShadow=!mobile();node.receiveShadow=true;const mat=node.material;
  if(!mat)return;const mats=Array.isArray(mat)?mat:[mat];mats.forEach(material=>{
   if(!material.isMeshStandardMaterial&&!material.isMeshPhysicalMaterial)return;
   if((material.name||'').toLowerCase().includes('paint'))paintMaterials.push(material);
   material.envMapIntensity=2.0;
   if((material.name||'').toLowerCase().includes('glass')){material.roughness=.06;material.metalness=.28;}
  });
 });
 normalizeModel(m,4.5,carRig,true);applyPaint('obsidian');modelDone();
},(e)=>{if(e.total)loadFill.style.width=`${Math.floor(e.loaded/e.total*52)}%`;},e=>modelError('car',e));
loader.load('./stainless-wet-dry-vacuum.glb',gltf=>{
 const m=gltf.scene;m.traverse(n=>{if(n.isMesh){n.castShadow=false;n.receiveShadow=true;const mats=Array.isArray(n.material)?n.material:[n.material];mats.forEach(x=>{if(x&&x.isMeshStandardMaterial)x.envMapIntensity=2.4;});}});
 normalizeModel(m,1.75,vacuumRig,true);modelDone();
},undefined,e=>modelError('vacuum',e));
loader.load('./plaggy_cc0-drops-523.glb',gltf=>{
 const m=gltf.scene;
 m.traverse(n=>{if(n.isMesh){n.material=new THREE.MeshPhysicalMaterial({color:'#a5e1ff',metalness:.12,roughness:.06,transmission:.35,thickness:.3,transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false});n.castShadow=false;}});
 normalizeModel(m,1.65,dropletsRig,false);modelDone();
},undefined,e=>modelError('water droplets',e));

// Five camera poses; accumulated azimuth passes 2π for a genuine full orbit.
const keys=[
 {p:0,a:.65,r:8.1,h:2.15,lx:-.55,ly:-.08},
 {p:.20,a:1.72,r:7.0,h:2.8,lx:-.4,ly:-.1},
 {p:.40,a:2.65,r:6.8,h:2.0,lx:-.25,ly:-.12},
 {p:.60,a:3.65,r:7.4,h:2.25,lx:-.2,ly:-.05},
 {p:.80,a:5.20,r:7.0,h:1.8,lx:-.25,ly:-.04},
 {p:1,a:7.05,r:8.2,h:2.1,lx:-.15,ly:-.08}
];
function poseAt(t){let index=0;while(index<keys.length-2&&t>keys[index+1].p)index++;const a=keys[index],b=keys[index+1],f=smoothstep(a.p,b.p,t);return {a:lerp(a.a,b.a,f),r:lerp(a.r,b.r,f),h:lerp(a.h,b.h,f),lx:lerp(a.lx,b.lx,f),ly:lerp(a.ly,b.ly,f)};}
const startPose=poseAt(0);
const startFactor=mobile()?1.45:1;
camera.position.set(startPose.r*Math.sin(startPose.a)*startFactor,startPose.h*startFactor,startPose.r*Math.cos(startPose.a)*startFactor);
camera.lookAt(new THREE.Vector3(startPose.lx,startPose.ly,0));
const look=new THREE.Vector3(startPose.lx,startPose.ly,0);
const desired=new THREE.Vector3();
const screenPos=new THREE.Vector3();
function projectPin(pin,anchor,visible){
 if(!visible){pin.classList.remove('is-visible');return;}
 screenPos.copy(anchor).project(camera);
 const px=(screenPos.x*.5+.5)*innerWidth,py=(-screenPos.y*.5+.5)*innerHeight;
 if(screenPos.z<-1||screenPos.z>1||px<35||px>innerWidth-35||py<84||py>innerHeight-75){pin.classList.remove('is-visible');return;}
 pin.style.left=`${px}px`;pin.style.top=`${py}px`;pin.classList.add('is-visible');
}
function progressValue(){const max=document.documentElement.scrollHeight-innerHeight;return clamp(max>0?window.scrollY/max:0);}
function jump(progress){const max=document.documentElement.scrollHeight-innerHeight;window.scrollTo({top:Math.max(0,max)*progress,behavior:reduceMotion?'instant':'smooth'});}
buttonJump.forEach(btn=>btn.addEventListener('click',()=>jump(Number(btn.dataset.jump))));
$('#headerCta').addEventListener('click',()=>jump(.94));
$('#brandLink').addEventListener('click',e=>{e.preventDefault();jump(0);});
function activeChapter(t){return t<.185?0:t<.385?1:t<.585?2:t<.79?3:4;}
function updateUI(t){
 const c=activeChapter(t);
 if(c!==frame.chapter){frame.chapter=c;chapterEls.forEach((el,i)=>el.classList.toggle('is-active',i===c));
  $('#chapterNumber').textContent=String(c+1).padStart(2,'0');
  $$('.timeline-marks button').forEach((el,i)=>el.classList.toggle('is-current',i===c));
  navButtons.forEach((el,i)=>el.classList.toggle('is-active',i===Math.min(c,3)));
 }
 $('#timelineProgress').style.width=`${(t*100).toFixed(2)}%`;
 $('#percentage').textContent=String(Math.round(t*100)).padStart(3,'0');
 hint.style.opacity=t>.08?'0':'1';
 const servicesActive=t>.795;$('#services').classList.toggle('is-visible',servicesActive);
 // Keep body text, service cards, and hotspot targets separate on small screens.
 const activeWash=t>.21&&t<.355, activeVac=t>.42&&t<.57, activePolish=t>.63&&t<.77;
 if(!mobile()){
  projectPin(pins[0],new THREE.Vector3(.7,.21,1.1),activeWash);
  projectPin(pins[1],new THREE.Vector3(-1.65,.35,-1.65),activeVac);
  projectPin(pins[2],new THREE.Vector3(1.3,.22,.7),activePolish);
 }else{
  // Mobile: use clear screen coordinates to avoid hotspots disappearing when the car is edge-on.
  const active=[activeWash,activeVac,activePolish];pins.forEach((el,i)=>{el.classList.toggle('is-visible',active[i]);el.style.left='60%';el.style.top='69%';});
 }
}
window.addEventListener('pointermove',ev=>{frame.mouseTargetX=(ev.clientX/innerWidth-.5)*2;frame.mouseTargetY=(ev.clientY/innerHeight-.5)*2;},{passive:true});
let cachedTarget=0;window.addEventListener('scroll',()=>{cachedTarget=progressValue();},{passive:true});
window.addEventListener('resize',resize,{passive:true});resize();cachedTarget=progressValue();updateUI(0);

const serviceData={
 mini:{number:'01 / 03',title:'Mini Valet',subtitle:'The essential refresh.',price:'€90',items:['Exterior hand wash','Interior vacuum','Dashboard and touchpoint wipe','Interior and exterior glass clean','Finishing check']},
 full:{number:'02 / 03',title:'Full Valet',subtitle:'The complete experience.',price:'€150',items:['Thorough interior vacuum and detail','Exterior wash and wheel care','Interior surfaces and hard-to-reach areas','Glass and trim finishing','Final inspection']},
 extras:{number:'03 / 03',title:'Finishing Extras',subtitle:'Targeted care for your vehicle.',price:'On request',items:['Headlight restoration','Machine polish / paint enhancement','Upholstery deep clean','Additional detailing by quotation']}
};
let activeService='mini';let oldFocus=null;
function openService(type){
 if(!serviceData[type])return;activeService=type;oldFocus=document.activeElement;
 const s=serviceData[type];$('#drawerNumber').textContent=s.number;$('#drawerTitle').textContent=s.title;
 $('#drawerSubtitle').textContent=s.subtitle;$('#drawerPrice').textContent=s.price;
 $('#drawerList').replaceChildren(...s.items.map(item=>{const li=document.createElement('li');li.textContent=item;return li;}));
 $('#copiedLabel').textContent='';$('#drawerBackdrop').hidden=false;
 $('#serviceDrawer').classList.add('is-open');$('#serviceDrawer').setAttribute('aria-hidden','false');
 document.body.style.overflow='hidden';$('#closeDrawer').focus();
}
function closeService(){const d=$('#serviceDrawer');if(!d.classList.contains('is-open'))return;d.classList.remove('is-open');d.setAttribute('aria-hidden','true');$('#drawerBackdrop').hidden=true;document.body.style.overflow='';oldFocus?.focus?.();}
$$('[data-service]').forEach(el=>el.addEventListener('click',()=>openService(el.dataset.service)));
$$('[data-pin]').forEach(el=>el.addEventListener('click',()=>openService(({wash:'mini',vacuum:'full',polish:'extras'})[el.dataset.pin])));
$('#drawerBackdrop').addEventListener('click',closeService);$('#closeDrawer').addEventListener('click',closeService);
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeService();if(e.key==='Tab'&&$('#serviceDrawer').classList.contains('is-open')){const controls=[$('#closeDrawer'),$('#copySelection')];if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls[1].focus();}else if(!e.shiftKey&&document.activeElement===controls[1]){e.preventDefault();controls[0].focus();}}});
$('#copySelection').addEventListener('click',async()=>{
 const s=serviceData[activeService];const text=`Dublin Detail enquiry\nService: ${s.title}\nIndicative price: ${s.price}\nPlease confirm service inclusions, availability and booking details.`;
 try{await navigator.clipboard.writeText(text);$('#copiedLabel').textContent='Enquiry details copied. Paste into your preferred messaging app.';}
 catch{const temp=document.createElement('textarea');temp.value=text;temp.style.position='fixed';temp.style.opacity='0';document.body.append(temp);temp.select();const success=document.execCommand('copy');temp.remove();$('#copiedLabel').textContent=success?'Enquiry details copied.':'Copying is unavailable in this browser.';}
});

let currentFps=60,framesSeen=0,lastFpsCheck=performance.now();
function animate(){requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.05),time=clock.getElapsedTime();frame.time=time;
 frame.target=cachedTarget;
 frame.scroll+= (frame.target-frame.scroll)*(reduceMotion?1:Math.min(.12,dt*3.1));
 const t=frame.scroll;
 frame.mouseX+= (frame.mouseTargetX-frame.mouseX)*Math.min(1,dt*3);
 frame.mouseY+= (frame.mouseTargetY-frame.mouseY)*Math.min(1,dt*3);
 const pose=poseAt(t),factor=mobile()?1.45:1;
 desired.set(pose.r*Math.sin(pose.a)*factor,pose.h*factor,pose.r*Math.cos(pose.a)*factor);
 camera.position.lerp(desired,Math.min(1,dt*2.9));
 look.lerp(new THREE.Vector3(pose.lx,pose.ly,0),Math.min(1,dt*3));
 camera.lookAt(look);camera.rotateX(-frame.mouseY*.008);camera.rotateY(-frame.mouseX*.012);
 bgUniforms.uTime.value=time;bgUniforms.uScroll.value=t;bgUniforms.uMouse.value.set(frame.mouseX,frame.mouseY);
 // Reveal water and vacuum only in their own story chapters.
 const washAlpha=smoothstep(.14,.23,t)*(1-smoothstep(.34,.41,t));
 const vacAlpha=smoothstep(.37,.44,t)*(1-smoothstep(.56,.64,t));
 const finishAlpha=smoothstep(.57,.66,t)*(1-smoothstep(.79,.83,t));
 vacuumRig.visible=vacAlpha>.018;
 if(vacuumRig.visible){const scale=.65+.35*vacAlpha;vacuumRig.scale.setScalar(scale);vacuumRig.rotation.y=.3+Math.sin(time*.3)*.025;}
 animateWater(time,washAlpha);animateDust(time,vacAlpha);animatePolish(time,finishAlpha);
 ringMat.color.setRGB(lerp(.29,.65,t),lerp(.64,.47,t),lerp(.75,.3,t));
 const rotationGlow=1+.11*Math.sin(time*.8);ring.scale.setScalar(rotationGlow);
 if(paintMaterials.length)paintMaterials.forEach(mat=>{mat.roughness=lerp(.25,.12,washAlpha*.75+finishAlpha*.55);});
 updateUI(t);
 renderer.render(scene,camera);
 framesSeen++;if(time-lastFpsCheck*.001>3){currentFps=framesSeen/(time-lastFpsCheck*.001);lastFpsCheck=performance.now();framesSeen=0;if(currentFps<25&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);}}
}
animate();

// Never hold the screen hostage if a CDN or GLB fails to load.
setTimeout(()=>{if(!loadStatus.classList.contains('is-done')){loadLabel.textContent='Continuing with available 3D assets';loadStatus.classList.add('is-done');}},13000);
