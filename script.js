<script>
/* ── CURSOR ── */
const cursor=document.getElementById('cursor'),cring=document.getElementById('cursorRing');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
(function ac(){cursor.style.left=mx+'px';cursor.style.top=my+'px';rx+=(mx-rx)*.12;ry+=(my-ry)*.12;cring.style.left=rx+'px';cring.style.top=ry+'px';requestAnimationFrame(ac);})();
document.querySelectorAll('a,button').forEach(el=>{
  el.addEventListener('mouseenter',()=>{cring.style.width='52px';cring.style.height='52px';cring.style.borderColor='rgba(200,151,58,0.7)';});
  el.addEventListener('mouseleave',()=>{cring.style.width='32px';cring.style.height='32px';cring.style.borderColor='rgba(200,151,58,0.5)';});
});

/* ════════════════════════════════════════════════
   CANVAS — shared for splash + falling seeds
════════════════════════════════════════════════ */
const CV=document.getElementById('introCanvas'),CX=CV.getContext('2d');
function rsz(){CV.width=innerWidth;CV.height=innerHeight;}rsz();
window.addEventListener('resize',rsz);
const rand=(a,b)=>a+Math.random()*(b-a);

/* ════════════════════════════════════════════════
   FALLING COFFEE SEEDS — hero section only
   • Canvas sits absolute inside #hero
   • ALL seeds fall from top, scatter & bounce at bottom
   • Stay settled, scroll away with hero, come back on up
   • Refresh = fresh fall
════════════════════════════════════════════════ */
const heroEl=document.getElementById('hero');
const SC=document.createElement('canvas');
SC.id='seedCanvas';
Object.assign(SC.style,{
  position:'absolute',inset:'0',width:'100%',height:'100%',
  pointerEvents:'none',zIndex:'8',display:'block'
});
heroEl.appendChild(SC);
const SX=SC.getContext('2d');

function rszS(){SC.width=heroEl.offsetWidth;SC.height=heroEl.offsetHeight;}
rszS();
window.addEventListener('resize',rszS);

/* Draw a realistic coffee bean */
function drawSeed(ctx,x,y,w,h,rot,col,alpha){
  if(alpha<=0)return;
  ctx.save();
  ctx.globalAlpha=Math.min(1,alpha);
  ctx.translate(x,y);
  ctx.rotate(rot);
  ctx.shadowColor='rgba(0,0,0,0.4)';
  ctx.shadowBlur=7;
  ctx.shadowOffsetY=4;
  ctx.beginPath();
  ctx.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);
  const g=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);
  g.addColorStop(0,'#7C5548');
  g.addColorStop(0.35,col);
  g.addColorStop(1,'#1A0E08');
  ctx.fillStyle=g;
  ctx.fill();
  ctx.shadowColor='transparent';
  // crease
  ctx.beginPath();
  ctx.moveTo(0,-h/2*0.82);
  ctx.bezierCurveTo(-w*0.13,-h*0.08,-w*0.11,h*0.08,0,h/2*0.82);
  ctx.strokeStyle='rgba(12,4,2,0.8)';
  ctx.lineWidth=Math.max(0.8,w*0.11);
  ctx.lineCap='round';
  ctx.stroke();
  // shine
  ctx.beginPath();
  ctx.ellipse(-w*0.14,-h*0.16,w*0.11,h*0.17,-0.35,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,0.13)';
  ctx.fill();
  ctx.restore();
}

const FLOOR=()=>SC.height-22;
const HERO_W=()=>SC.width;

const BROWNS=['#5D4037','#4E342E','#3E2723','#6D4C41','#795548','#4A2C1A'];

class FallingSeed{
  constructor(launchDelay, startX){
    this.launchDelay = launchDelay;
    this.launched    = false;
    this.settled     = false;
    this.startTime   = null;

    this.w   = rand(16, 34);
    this.h   = this.w * rand(1.5, 2.0);
    this.col = BROWNS[Math.floor(Math.random()*BROWNS.length)];

    // spawn across full width — evenly zoned so none cluster
    this.x   = startX !== undefined ? startX : rand(this.w, HERO_W()-this.w);
    this.y   = -this.h - rand(0, 80);   // just above top, staggered heights

    // throw physics — tossed in like scattered handful
    this.vx      = rand(-3.5, 3.5);
    this.vy      = rand(1.5, 4.5);
    this.rot     = rand(0, Math.PI*2);
    this.rotSpd  = rand(-0.055, 0.055);
    this.grav    = rand(0.10, 0.20);
    this.bounce  = rand(0.22, 0.48);
    this.friction= 0.76;
    this.bounceCount = 0;
    this.maxBounces  = Math.floor(rand(1, 4));
    this.alpha   = 0;
  }

  update(now){
    if(!this.startTime){ this.startTime=now; return; }
    if(now - this.startTime < this.launchDelay) return;
    if(!this.launched) this.launched = true;

    this.alpha = Math.min(1, this.alpha + 0.07);
    if(this.settled) return;

    this.vy  += this.grav;
    this.x   += this.vx;
    this.y   += this.vy;
    this.rot += this.rotSpd;

    // wall bounce — keep inside hero width
    if(this.x - this.w/2 < 0){
      this.x  = this.w/2;
      this.vx = Math.abs(this.vx)*0.45;
    }
    if(this.x + this.w/2 > HERO_W()){
      this.x  = HERO_W()-this.w/2;
      this.vx = -Math.abs(this.vx)*0.45;
    }

    // floor collision
    const floor = FLOOR();
    if(this.y + this.h/2 >= floor){
      this.y = floor - this.h/2;
      if(this.bounceCount < this.maxBounces && Math.abs(this.vy) > 1.2){
        this.vy       = -Math.abs(this.vy) * this.bounce;
        this.vx      *= this.friction;
        this.rotSpd  *= 0.55;
        this.bounceCount++;
      } else {
        this.vy      = 0;
        this.vx     *= 0.80;
        this.rotSpd *= 0.85;
        if(Math.abs(this.vx)<0.04 && Math.abs(this.rotSpd)<0.002){
          this.vx=0; this.rotSpd=0; this.settled=true;
        }
      }
    }
  }

  draw(){
    if(!this.launched || this.alpha<=0) return;
    drawSeed(SX, this.x, this.y, this.w, this.h, this.rot, this.col, this.alpha);
  }
}

/* ── Build seeds spread evenly across full width ── */
const SEEDS = [];
const TOTAL = 55;   // enough to fill the wide hero visually

// Divide screen into zones so seeds spread wall-to-wall
// Each zone gets 1-2 seeds, staggered timing
for(let i=0; i<TOTAL; i++){
  // zone-based x: divide into TOTAL columns, add jitter
  const zoneW  = (innerWidth || 1440) / TOTAL;
  const zoneX  = zoneW * i + rand(0, zoneW);
  const clampX = Math.max(18, Math.min((innerWidth||1440)-18, zoneX));

  // stagger timing: first seed ~100ms, last ~6s — dense wave feel
  const delay  = 100 + i * rand(80, 160) + rand(0, 100);
  SEEDS.push(new FallingSeed(delay, clampX));
}

let seedRaf     = null;
let seedRunning = true;

function seedLoop(now){
  if(!seedRunning){ seedRaf=null; return; }
  SX.clearRect(0, 0, SC.width, SC.height);
  SEEDS.forEach(s=>{ s.update(now); s.draw(); });
  seedRaf = requestAnimationFrame(seedLoop);
}
seedRaf = requestAnimationFrame(seedLoop);

/* Pause when hero scrolled out of view, resume on return */
window.addEventListener('scroll', ()=>{
  const r       = heroEl.getBoundingClientRect();
  const visible = r.bottom > 0 && r.top < window.innerHeight;
  if(visible && !seedRaf){
    seedRunning = true;
    seedRaf     = requestAnimationFrame(seedLoop);
  } else if(!visible && seedRaf){
    seedRunning = false;
    cancelAnimationFrame(seedRaf);
    seedRaf = null;
    // paint settled state one last time so they show on scroll-up
    SX.clearRect(0, 0, SC.width, SC.height);
    SEEDS.forEach(s => s.draw());
  }
},{ passive:true });


/* ════════════════════════════════════════════════
   SIMPLE CLEAN COFFEE SPLASH
   Mug pours → wave of coffee spreads from pour
   point, runs down naturally. No explosions.
   Three layers: dark liquid wave, mid spread,
   crema foam + drips sliding down.
════════════════════════════════════════════════ */

/* A liquid wave panel that fills from top-down */
class LiquidWave{
  constructor(delay,color,targetH,speed,alpha){
    this.delay=delay;this.born=performance.now();
    this.color=color;
    this.y=0;this.targetH=targetH;
    this.speed=speed;
    this.alpha=alpha;
    this.waveOff=rand(0,Math.PI*2);
    this.active=false;this.done=false;
    this.draining=false;this.drainY=0;
  }
  update(now){
    if(now-this.born<this.delay)return;
    this.active=true;
    if(!this.draining){
      this.y=Math.min(this.targetH,this.y+this.speed);
    } else {
      this.drainY+=3.5;
      if(this.drainY>CV.height+50)this.done=true;
    }
    this.waveOff+=0.04;
  }
  draw(now){
    if(!this.active||this.done)return;
    const t=now*0.001;
    CX.save();
    CX.globalAlpha=this.alpha;
    CX.fillStyle=this.color;
    CX.beginPath();
    CX.moveTo(0,this.drainY);
    // wavy top edge
    for(let x=0;x<=CV.width+20;x+=8){
      const waveY=this.drainY+this.y+Math.sin(x*0.018+t+this.waveOff)*9+Math.sin(x*0.031+t*1.3)*5;
      x===0?CX.lineTo(x,waveY):CX.lineTo(x,waveY);
    }
    CX.lineTo(CV.width,this.drainY);
    CX.closePath();
    CX.fill();
    CX.restore();
  }
}

/* Drip: a single drop running straight down the screen */
class Drip{
  constructor(x,startY,color,delay){
    this.x=x;this.y=startY;
    this.vy=rand(1.2,4.0);
    this.grav=rand(0.04,0.10);
    this.w=rand(4,14);       // width of drip
    this.color=color;
    this.segs=[{x,y:startY}];
    this.alpha=rand(0.7,0.95);
    this.active=true;
    this.delay=delay;this.born=performance.now();
    this.wobble=rand(0,Math.PI*2);
    this.wobSpd=rand(0.03,0.07);
    this.done=false;
    this.draining=false;
  }
  update(now){
    if(now-this.born<this.delay)return;
    if(this.active){
      this.wobble+=this.wobSpd;
      this.vy+=this.grav;
      this.x+=Math.sin(this.wobble)*0.5;
      this.y+=this.vy;
      this.segs.push({x:this.x,y:this.y});
      if(this.segs.length>200||this.y>CV.height+20){
        this.active=false;
      }
    }
    if(!this.active&&!this.draining){this.alpha-=0.006;if(this.alpha<=0)this.done=true;}
    if(this.draining){this.alpha-=0.018;if(this.alpha<=0)this.done=true;}
  }
  draw(now){
    if(now-this.born<this.delay||this.segs.length<2)return;
    CX.save();CX.lineCap='round';CX.lineJoin='round';
    for(let i=1;i<this.segs.length;i++){
      const t=i/this.segs.length;
      CX.globalAlpha=this.alpha*(0.4+t*0.6);
      CX.strokeStyle=this.color;
      CX.lineWidth=Math.max(1,this.w*(0.35+t*0.65));
      CX.beginPath();
      CX.moveTo(this.segs[i-1].x,this.segs[i-1].y);
      CX.lineTo(this.segs[i].x,this.segs[i].y);
      CX.stroke();
    }
    // bulging round tip
    if(this.active){
      const last=this.segs[this.segs.length-1];
      CX.globalAlpha=this.alpha;
      CX.fillStyle=this.color;
      CX.beginPath();
      CX.ellipse(last.x,last.y,this.w*0.7,this.w*1.0,0,0,Math.PI*2);
      CX.fill();
    }
    CX.restore();
  }
}

/* Splash state */
let waves=[],drips=[],rafId=null;

function spawnSplash(){
  const W=CV.width,H=CV.height;
  // Three wave layers filling from top — like coffee spreading across screen
  waves.push(new LiquidWave(0,   '#1A0A06', H,      3.8, 0.97)); // dark base fills fast
  waves.push(new LiquidWave(180, '#2A1510', H*0.85, 2.6, 0.82)); // mid layer
  waves.push(new LiquidWave(380, '#3E2723', H*0.65, 1.8, 0.68)); // lighter top swell
  waves.push(new LiquidWave(550, '#8D6E63', H*0.22, 1.0, 0.28)); // crema foam on top

  // Drips spawned after wave hits bottom — run down naturally
  for(let i=0;i<32;i++){
    drips.push(new Drip(
      rand(0, W),
      rand(0, H*0.15),
      i%5===0?'#6D4C41':'#1A0A06',
      200+i*55+rand(0,80)
    ));
  }
}

function tick(now){
  CX.clearRect(0,0,CV.width,CV.height);
  waves.forEach(w=>{w.update(now);w.draw(now);});
  drips.forEach(d=>{d.update(now);d.draw(now);});
  drips=drips.filter(d=>!d.done);
  rafId=requestAnimationFrame(tick);
}

function startSplash(){spawnSplash();rafId=requestAnimationFrame(tick);}

function drainSplash(cb){
  waves.forEach(w=>w.draining=true);
  drips.forEach(d=>d.draining=true);
  // fade the whole canvas out
  let a=0;
  const iv=setInterval(()=>{
    CX.save();CX.globalAlpha=0.07;CX.fillStyle='#0D0604';CX.fillRect(0,0,CV.width,CV.height);CX.restore();
    a+=0.07;
    if(a>=1){clearInterval(iv);cancelAnimationFrame(rafId);CX.clearRect(0,0,CV.width,CV.height);cb&&cb();}
  },16);
}

/* ════════════════════════════════════════════
   INTRO SEQUENCE
════════════════════════════════════════════ */
gsap.registerPlugin(ScrollTrigger);
const introEl=document.getElementById('intro');
const mugWrap=document.getElementById('introMugWrap');
const introMug=document.getElementById('introMugSvg');
const introName=document.getElementById('introName');
const introTag=document.getElementById('introTag');

gsap.set(['#word1','#word2','#mugSvg','#steam','#scrollHint'],{opacity:0});
gsap.set('#mugSvg',{scale:0});
gsap.set(mugWrap,{y:-130,opacity:0,scale:0.55});
gsap.set(introName,{opacity:0,y:18});
gsap.set(introTag,{opacity:0,y:12});

const introTL=gsap.timeline();
// Drop mug in
introTL.to(mugWrap,{y:0,opacity:1,scale:1,duration:0.85,ease:'bounce.out'},0.3)
// Name appears
.to(introName,{opacity:1,y:0,duration:0.5,ease:'expo.out'},1.1)
.to(introTag,{opacity:1,y:0,duration:0.4,ease:'expo.out'},1.35)
// HUMAN POUR: mug tilts slowly like a person pouring
.to(introMug,{rotation:-12,duration:0.4,ease:'power1.inOut'},2.0)   // tilt to pour
.to(introMug,{rotation:-35,y:15,duration:0.55,ease:'power2.in'},2.4) // pour position
// START SPLASH as coffee pours out
.call(()=>startSplash(),null,2.55)
// Mug slowly settles back (realistic, not flung away)
.to(introMug,{rotation:-20,y:5,duration:0.3,ease:'power1.out'},3.1)
.to(introMug,{rotation:0,y:0,opacity:0,scale:0.7,duration:0.4,ease:'power2.in'},3.45)
// Name fades
.to([introName,introTag],{opacity:0,duration:0.55,ease:'power2.in'},3.2)
// Drain and reveal
.call(()=>{
  drainSplash(()=>{
    gsap.to(introEl,{y:'-100%',duration:0.85,ease:'expo.inOut',onComplete:()=>{
      introEl.style.display='none';
      const ht=gsap.timeline();
      ht.to('#mugSvg',{scale:1,opacity:1,duration:1,ease:'back.out(1.5)'},0)
        .to('#word1',{y:'0%',opacity:1,duration:0.7,ease:'expo.out'},0.2)
        .to('#word2',{y:'0%',opacity:1,duration:0.7,ease:'expo.out'},0.32)
        .to('#steam',{opacity:1,duration:0.5},0.6)
        .to('#scrollHint',{opacity:1,duration:0.5},0.8);
      gsap.to('#mugSvg',{y:-10,duration:3,repeat:-1,yoyo:true,ease:'sine.inOut',delay:1.2});
    }});
  });
},null,4.0);

gsap.set('#word1',{y:'110%'});gsap.set('#word2',{y:'110%'});

/* ── HERO SCROLL parallax ── */
ScrollTrigger.create({
  trigger:'#hero',start:'top top',end:'bottom top',scrub:1.2,
  onUpdate:self=>{
    const p=self.progress;
    gsap.set('#mug-scene',{y:p*180,rotation:p*20,opacity:1-Math.min(1,p*2.2),scale:1-p*.22});
    gsap.set('#titleLeft',{y:p*70,opacity:1-p*1.5});
    gsap.set('#titleRight',{y:p*95,opacity:1-p*1.5});
    gsap.set('#steam',{opacity:1-Math.min(1,p*2.2)});
    gsap.set('#scrollHint',{opacity:Math.max(0,1-p*6)});
  }
});

/* ══════════════════════════════════════════════
   COFFEE BEAN SPLIT
   — scroll-driven AND tap/click to open
══════════════════════════════════════════════ */

/* Shared function: apply visual state for a 0→1 progress value */
function applyBeanProgress(p){
  // Phase 1 (0→0.15): zoom in
  const zoomP = Math.min(1, p / 0.15);
  const scale  = 0.3 + zoomP * 0.7;
  document.querySelector('.bean-halves').style.transform = `scale(${scale})`;

  // Phase 2 (0.15→0.75): split apart
  const splitP  = Math.max(0, Math.min(1, (p - 0.15) / 0.6));
  const splitPx = splitP * 340;

  // Crack glow
  const crackAlpha = Math.min(1, splitP * 2.5);
  document.getElementById('beanCrack').style.opacity =
    crackAlpha * (1 - Math.max(0, (splitP - 0.7) / 0.3));

  // Reveal content
  const revealP = Math.max(0, Math.min(1, (splitP - 0.3) / 0.5));
  const reveal  = document.getElementById('beanReveal');
  reveal.style.opacity   = revealP;
  reveal.style.transform = `translate(-50%,-50%) scale(${0.85 + revealP * 0.15})`;
  reveal.style.pointerEvents = revealP > 0.5 ? 'all' : 'none';

  // Phase 3 (0.75→1): rotate + fade out
  const exitP = Math.max(0, (p - 0.75) / 0.25);
  document.getElementById('beanHalfLeft').style.transform  =
    `translateX(-${splitPx + exitP * 120}px) rotate(${-exitP * 22}deg)`;
  document.getElementById('beanHalfRight').style.transform =
    `translateX(${splitPx + exitP * 120}px) rotate(${exitP * 22}deg)`;
  document.getElementById('beanHalfLeft').style.opacity  = 1 - exitP * 0.8;
  document.getElementById('beanHalfRight').style.opacity = 1 - exitP * 0.8;

  // Floating bg beans
  const fbOpacity = Math.min(1, splitP * 1.5);
  ['fb1','fb2','fb3','fb4'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.style.opacity   = fbOpacity * 0.35;
    el.style.transform = `rotate(${p*360*(i%2?1:-1)*0.4}deg) translateY(${Math.sin(p*Math.PI+i)*18}px)`;
  });
}

/* ── Scroll-driven ── */
ScrollTrigger.create({
  trigger: '#bean-split',
  start:   'top top',
  end:     'bottom bottom',
  scrub:   1.5,
  onUpdate(self){ applyBeanProgress(self.progress); }
});

/* ── Tap / Click to open (plays animated split) ── */
let beanTapOpen = false;
let beanTapTween = null;

const beanHalves = document.querySelector('.bean-halves');
const beanStickyEl = document.querySelector('.bean-split-sticky');

/* Pulse hint on the bean */
const tapHintBean = document.createElement('div');
tapHintBean.id = 'beanTapHint';
Object.assign(tapHintBean.style, {
  position:'absolute', bottom:'28px', left:'50%',
  transform:'translateX(-50%)',
  fontFamily:"'DM Sans',sans-serif",
  fontSize:'0.6rem', letterSpacing:'0.28em', textTransform:'uppercase',
  color:'rgba(200,151,58,0.7)', whiteSpace:'nowrap',
  pointerEvents:'none', zIndex:'10',
  animation:'hintPulse 1.9s ease-in-out infinite'
});
tapHintBean.textContent = '✦ tap to crack open';
beanStickyEl.appendChild(tapHintBean);

/* Add keyframe for hint if not already present */
const hintStyle = document.createElement('style');
hintStyle.textContent = `
  @keyframes hintPulse{0%,100%{opacity:0.35;transform:translateX(-50%) scale(0.97)}50%{opacity:1;transform:translateX(-50%) scale(1.03)}}
  .bean-split-sticky{ cursor:pointer; }
  #beanTapHint{ transition:opacity 0.4s; }
`;
document.head.appendChild(hintStyle);

const tapObj = { p: 0 };

function playBeanOpen(){
  if(beanTapOpen) return;
  beanTapOpen = true;
  // hide hint
  tapHintBean.style.opacity = '0';

  // crack sound — tiny vibration on mobile
  if(navigator.vibrate) navigator.vibrate([12, 30, 8]);

  // animate p from 0 → 0.74 (fully split + revealed, but don't exit)
  if(beanTapTween) beanTapTween.kill();
  beanTapTween = gsap.to(tapObj, {
    p: 0.74,
    duration: 1.4,
    ease: 'power2.inOut',
    onUpdate(){ applyBeanProgress(tapObj.p); },
    onComplete(){
      // pulse open effect
      gsap.to(tapObj, {
        p: 0.78,
        duration: 0.18,
        ease: 'power1.out',
        yoyo: true,
        repeat: 1,
        onUpdate(){ applyBeanProgress(tapObj.p); },
        onComplete(){
          tapObj.p = 0.74;
          applyBeanProgress(0.74);
        }
      });
    }
  });
}

function playBeanClose(){
  if(!beanTapOpen) return;
  if(beanTapTween) beanTapTween.kill();
  beanTapTween = gsap.to(tapObj, {
    p: 0,
    duration: 0.9,
    ease: 'power2.inOut',
    onUpdate(){ applyBeanProgress(tapObj.p); },
    onComplete(){
      beanTapOpen = false;
      tapHintBean.style.opacity = '1';
    }
  });
}

beanStickyEl.addEventListener('click', ()=>{
  beanTapOpen ? playBeanClose() : playBeanOpen();
});
beanStickyEl.addEventListener('touchstart', e=>{
  e.preventDefault();
  beanTapOpen ? playBeanClose() : playBeanOpen();
}, { passive:false });

/* ── Fade-up sections ── */
gsap.utils.toArray('.fade-up').forEach(el=>{
  gsap.fromTo(el,{opacity:0,y:55},{opacity:1,y:0,duration:1.1,ease:'expo.out',
    scrollTrigger:{trigger:el,start:'top 82%',toggleActions:'play none none reverse'}});
});

/* ── Product card tilt ── */
document.querySelectorAll('.product-card').forEach(card=>{
  card.addEventListener('mousemove',e=>{
    const r=card.getBoundingClientRect();
    const dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);
    gsap.to(card,{rotateY:dx*6,rotateX:-dy*4,duration:.4,ease:'power2.out',transformPerspective:800});
  });
  card.addEventListener('mouseleave',()=>gsap.to(card,{rotateY:0,rotateX:0,duration:.6,ease:'expo.out'}));
});

gsap.fromTo('.cta-glow-orb',{scale:.8,opacity:.5},{scale:1.3,opacity:1,
  scrollTrigger:{trigger:'#cta',start:'top bottom',end:'center center',scrub:1.5}});
</script>