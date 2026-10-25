import type Phaser from 'phaser';
import { UI_FONT } from '../game/roles';
import level from '../../../data/level01.json';
import { sceneryAnchor, scenerySlices } from './sceneryLayout';

// Original pixel interpretations. Source/context: docs/SOURCES.md.
// Landmarks are scenery only; none receives an Arcade body or an official logo.
type Rect = (color: number, x: number, y: number, width: number, height: number) => void;
const painter = (g: Phaser.GameObjects.Graphics): Rect => (color,x,y,w,h) => { g.fillStyle(color); g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };

// Flatten static scenery once: scrolling uses a few images instead of replaying
// hundreds of vector rectangles each frame. Shared texture keys stay bounded.
function bake(scene: Phaser.Scene, graphics: Phaser.GameObjects.Graphics, key: string, width: number, scroll: number, height = 270): Phaser.GameObjects.Image {
  if (!scene.textures.exists(key)) graphics.generateTexture(key, width, height);
  graphics.destroy();
  return scene.add.image(0, 0, key).setOrigin(0).setScrollFactor(scroll).setName(key);
}

function bakeLayer(scene: Phaser.Scene, name: string, scroll: number, paint: (rect: Rect) => void): void {
  for (const slice of scenerySlices(level.world.width, level.world.viewportWidth, scroll)) {
    const key = `${name}-${level.world.width}-${slice.x}`;
    if (!scene.textures.exists(key)) {
      const graphics = scene.add.graphics(), rect = painter(graphics);
      paint((color, x, y, width, height) => {
        if (x + width >= slice.x && x < slice.x + slice.width) rect(color, x - slice.x, y, width, height);
      });
      graphics.generateTexture(key, slice.width, level.world.height); graphics.destroy();
    }
    scene.add.image(slice.x, 0, key).setOrigin(0).setScrollFactor(scroll).setName(key);
  }
}

export function paintTaipei101(rect: Rect, x: number, base: number, scale = 1): void {
  const b = (c:number,dx:number,dy:number,w:number,h:number) => rect(c,x+dx*scale,base+dy*scale,w*scale,h*scale);
  b(0x466688,-19,-18,38,18);
  for(let i=0;i<8;i++) {
    const y=-30-i*13;
    b(0x3C7885,-17,y,34,13); b(0x5DB4B8,-15,y,30,10);
    b(0xA7DED3,-17,y,34,2); b(0x2B6573,-13,y+10,26,3);
    for(const dx of [-10,-3,4]) b(0xC6F4EB,dx,y+3,3,5);
  }
  b(0x3C7885,-9,-136,18,15); b(0xA7DED3,-6,-136,12,12);
  b(0x466688,-2,-151,4,16); b(0xFFD45B,-3,-152,6,3);
}

export function paintNorthGate(rect: Rect, x: number, base: number, scale = 1): void {
  const b = (c:number,dx:number,dy:number,w:number,h:number) => rect(c,x+dx*scale,base+dy*scale,w*scale,h*scale);
  b(0x9EABA5,-54,-35,108,35); b(0xC3C2AB,-52,-33,104,30);
  for(let row=0;row<3;row++) for(let col=0;col<8;col++) b(0x9EABA5,-50+col*13+(row%2)*4,-30+row*10,9,1);
  b(0x253653,-11,-22,22,22); b(0x253653,-7,-27,14,5);
  b(0xB66D59,-37,-66,74,31); b(0xDB9B71,-32,-62,64,24);
  for(const dx of [-25,-3,19]) b(0x41366D,dx,-57,8,15);
  b(0x4E6276,-43,-72,86,6); b(0x4E6276,-35,-77,70,6);
  b(0x4E6276,-27,-80,54,4); b(0x4E6276,-47,-76,8,4); b(0x4E6276,39,-76,8,4);
  b(0xFFF4D8,-12,-34,24,7);
}

function shophouse(rect: Rect, x: number, base: number, variant: number): void {
  rect(variant%2?0xD9A582:0xBD8067,x,base-78,60,78);
  rect(0xFFF4D8,x+4,base-76,52,5); rect(0xFFF4D8,x+10,base-84,40,8);
  rect(0xD9A582,x+22,base-88,16,5);
  for(const dx of [8,25,42]) { rect(0x5B5978,x+dx,base-63,11,19); rect(0xFFF4D8,x+dx-1,base-65,13,3); }
  rect(0xD0E8DF,x+4,base-39,52,10); rect(0x835F51,x,base-27,60,4);
  for(const dx of [5,24,43]) {rect(0x775F66,x+dx,base-23,12,23);rect(0xFFF4D8,x+dx-3,base-25,3,25);}
  for(let row=0;row<3;row++) for(let col=0;col<3;col++) rect(0xC28A70,x+col*20+(row%2)*4,base-72+row*12,10,1);
  rect(0x73B992,x+5,base-2,7,2); rect(0x73B992,x+47,base-2,7,2);
}

export function drawTaipeiCity(scene: Phaser.Scene): void {
  const viewport = level.world.viewportWidth;
  const anchor = (worldX: number, scroll: number) => sceneryAnchor(worldX, viewport, scroll);
  const [north, dihua, river, xinyi] = level.acts;
  const skylineX = anchor((level.boss.arenaStartX + level.boss.arenaEndX) / 2, .1);
  const northX = anchor(north.fromX + 320, .35);
  const shopsX = anchor(dihua.fromX + 270, .35);
  const riverStart = anchor(river.fromX, .35) - 110;
  const riverEnd = anchor(river.toX, .35) + 70;
  const trackStart = anchor(xinyi.fromX + 240, .35);
  const trackEnd = anchor(level.exit.x, .35) + 180;
  const layerEnd = (scroll: number) => viewport + (level.world.width - viewport) * scroll;

  bakeLayer(scene, 'taipei-mountains', .1, f => {
    f(0xFFF4D8, 382, 68, 26, 26);
    for (let x = 0, i = 0; x < layerEnd(.1); x += 80, i++) {
      f(0x9DD8CB,x,176,80,56); f(0x9DD8CB,x+12,151-i%3*8,56,80); f(0x9DD8CB,x+26,139-i%3*8,28,90);
      if (i%2===0) f(0xFFF4D8,x+12,72+i%3*10,48,7);
    }
    paintTaipei101(f,skylineX,224,.95);
  });
  bakeLayer(scene, 'taipei-streets', .35, c => {
    for (let x = 0, i = 0; x < layerEnd(.35); x += 62, i++) {
      const h=32+i*17%35; c(0x91B7BB,x,224-h,50,h); c(0x6D929E,x-2,221-h,54,4);
      for(let y=230-h;y<217;y+=12) for(let dx=7;dx<46;dx+=14) c(0xFFF4D8,x+dx,y,5,6);
      if(i%3===0) { c(0xA8B8C5,x+12,208-h,17,12); c(0x58788A,x+10,205-h,21,4); }
    }
    paintNorthGate(c,northX,224);
    for(let i=0;i<7;i++) shophouse(c,shopsX+i*66,224,i);
    // The riverside and railway align with their chapters, even on a longer map.
    const riverWidth = riverEnd-riverStart;
    c(0x76CCD9,riverStart,176,riverWidth,56); c(0xBDEFE7,riverStart,187,riverWidth,3); c(0xBDEFE7,riverStart,205,riverWidth,2);
    for(let x=riverStart+10,i=0;x<riverEnd-20;x+=39,i++) c(0xFFF4D8,x,195+(i%2)*17,19,2);
    c(0xCFBA97,riverStart,222,riverWidth,8); c(0x9B867A,riverStart,218,riverWidth,4);
    const boat=riverStart+180;
    c(0x9C644C,boat,199,46,5); c(0xFFF4D8,boat+21,177,3,22); c(0xFFF4D8,boat+24,181,14,14); c(0x253653,boat+16,202,32,3);
    c(0x879DAA,trackStart,186,trackEnd-trackStart,7);
    for(let x=trackStart+14;x<trackEnd;x+=70) c(0x879DAA,x,193,5,36);
  });
  const trainShape=scene.add.graphics(), t=painter(trainShape);
  for(let i=0;i<3;i++) {
    t(0xFFF4D8,i*43,0,41,18); t(0x5B8EAC,i*43,12,41,4);
    for(let j=0;j<3;j++) t(0x466688,i*43+5+j*11,4,8,6);
    t(0x253653,i*43+5,18,6,3); t(0x253653,i*43+29,18,6,3);
  }
  const train=bake(scene,trainShape,'taipei-transit',130,.35,24);
  train.setPosition(trackStart+15,164);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reducedMotion) scene.tweens.add({targets:train,x:trackEnd-130,duration:16000,yoyo:true,repeat:-1});
  bakeLayer(scene, 'taipei-street-life', .75, n => {
    for(let x=18;x<layerEnd(.75);x+=128) {
      n(0x253653,x,196,3,48); n(0xFFD45B,x-3,193,9,7); n(0x4FAE87,x+55,232,28,12); n(0x73D6AA,x+59,228,20,6);
    }
    for(const worldX of [river.fromX+600,river.fromX+1600,xinyi.fromX+750]) {
      const x=anchor(worldX,.75);
      n(0x835F51,x,225,34,4); n(0x253653,x+3,229,3,12); n(0x253653,x+28,229,3,12);
    }
  });
  if (!reducedMotion) {
    for(let i=0;i<3;i++) {
      const glint=scene.add.rectangle(riverStart+80+i*95,199+(i%2)*12,24,2,0xFFF4D8,.4).setScrollFactor(.35);
      scene.tweens.add({targets:glint,x:glint.x+12,alpha:.1,duration:1800+i*400,yoyo:true,repeat:-1});
    }
    const cloud=scene.add.rectangle(290,98,36,5,0xFFF4D8,.65).setScrollFactor(.08);
    scene.tweens.add({targets:cloud,x:325,duration:16000,yoyo:true,repeat:-1});
  }
  for(const [x,y,text] of [[northX,130,'北門 · 承恩門'],[shopsX+150,119,'迪化街 · 茶行與騎樓'],[(riverStart+riverEnd)/2,162,'大稻埕 · 淡水河岸']] as const) {
    scene.add.text(x,y,text,{fontFamily:UI_FONT,fontSize:'10px',color:'#355167',backgroundColor:'#FFF4D8',padding:{x:3,y:2}}).setOrigin(.5).setScrollFactor(.35);
  }
  scene.add.text(skylineX,68,'台北101 · 象山意象',{fontFamily:UI_FONT,fontSize:'11px',color:'#355167',backgroundColor:'#FFF4D8',padding:{x:3,y:2}}).setOrigin(.5).setScrollFactor(.1);
}
export function drawTaipeiTitle(scene: Phaser.Scene): void {
  const g=scene.add.graphics();const r=painter(g);
  for(let i=0;i<8;i++){r(0x9DD8CB,i*70,161,70,66);r(0x9DD8CB,i*70+17,140-i%3*10,36,87);}
  r(0x76CCD9,0,221,480,49);r(0xBDEFE7,0,234,480,2);
  paintNorthGate(r,56,223,.8);paintTaipei101(r,444,223,1.05);
}

export function paintTaipeiScorecard(ctx: CanvasRenderingContext2D): void {
  const r:Rect=(color,x,y,w,h)=>{ctx.fillStyle=`#${color.toString(16).padStart(6,'0')}`;ctx.fillRect(x,y,w,h);};
  r(0xBDEFE7,70,898,940,20);
  for(let i=0;i<12;i++){const x=80+i*70;r(0x9DD8CB,x,870+i%3*9,52,48-i%3*9);}
  paintNorthGate(r,160,918,.78);shophouse(r,310,918,0);shophouse(r,374,918,1);
  r(0x76CCD9,500,893,240,25);r(0xFFF4D8,515,903,100,2);r(0xFFF4D8,640,909,72,2);
  paintTaipei101(r,905,918,.85);
}
