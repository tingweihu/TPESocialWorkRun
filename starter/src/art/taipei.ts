import type Phaser from 'phaser';
import { UI_FONT } from '../game/roles';

// Original pixel interpretations. Source/context: docs/12_TAIPEI_CONTEXT.md.
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
  const far=scene.add.graphics().setScrollFactor(.1).setName('taipei-mountains');const f=painter(far);
  f(0xFFF4D8,382,68,26,26);
  for(let i=0;i<12;i++) {
    const x=i*80; f(0x9DD8CB,x,176,80,56);f(0x9DD8CB,x+12,151-i%3*8,56,80);f(0x9DD8CB,x+26,139-i%3*8,28,90);
    if(i%2===0)f(0xFFF4D8,x+12,72+i%3*10,48,7);
  }
  paintTaipei101(f,585,224,.95);
  bake(scene,far,'taipei-mountains',1000,.1);
  const city=scene.add.graphics().setScrollFactor(.35).setName('taipei-streets');const c=painter(city);
  for(let i=0;i<26;i++) {
    const x=i*62,h=32+i*17%35;c(0x91B7BB,x,224-h,50,h);c(0x6D929E,x-2,221-h,54,4);
    for(let y=230-h;y<217;y+=12)for(let dx=7;dx<46;dx+=14)c(0xFFF4D8,x+dx,y,5,6);
    if(i%3===0){c(0xA8B8C5,x+12,208-h,17,12);c(0x58788A,x+10,205-h,21,4);}
  }
  paintNorthGate(c,140,224);
  for(let i=0;i<4;i++) shophouse(c,360+i*66,224,i);
  // Dadaocheng riverside interpretation: water, quay and a separate background path.
  c(0x76CCD9,610,176,345,56);c(0xBDEFE7,610,187,345,3);c(0xBDEFE7,610,205,345,2);
  for(let i=0;i<9;i++)c(0xFFF4D8,620+i*39,195+(i%2)*17,19,2);
  c(0xCFBA97,610,222,345,8);c(0x9B867A,610,218,345,4);
  c(0x9C644C,710,199,46,5);c(0xFFF4D8,731,177,3,22);c(0xFFF4D8,734,181,14,14);
  c(0x253653,726,202,32,3);
  // Transit is a generic Taipei-inspired train, not a specific line or station map.
  c(0x879DAA,980,186,430,7);
  for(let x=994;x<1400;x+=70)c(0x879DAA,x,193,5,36);
  bake(scene,city,'taipei-streets',1650,.35);
  const trainShape=scene.add.graphics();const t=painter(trainShape);
  for(let i=0;i<3;i++){t(0xFFF4D8,i*43,0,41,18);t(0x5B8EAC,i*43,12,41,4);for(let j=0;j<3;j++)t(0x466688,i*43+5+j*11,4,8,6);t(0x253653,i*43+5,18,6,3);t(0x253653,i*43+29,18,6,3);}
  const train=bake(scene,trainShape,'taipei-transit',130,.35,24);
  train.setPosition(995,164);scene.tweens.add({targets:train,x:1250,duration:11000,yoyo:true,repeat:-1});
  const near=scene.add.graphics().setScrollFactor(.75).setName('taipei-street-life');const n=painter(near);
  for(let i=0;i<23;i++){const x=i*128+18;n(0x253653,x,196,3,48);n(0xFFD45B,x-3,193,9,7);n(0x4FAE87,x+55,232,28,12);n(0x73D6AA,x+59,228,20,6);}
  for(const x of [1050,1120]) {near.lineStyle(2,0x466688).strokeCircle(x,237,6).strokeCircle(x+19,237,6).lineBetween(x,237,x+10,224).lineBetween(x+10,224,x+19,237).lineBetween(x,237,x+19,237);n(0x466688,x+6,221,8,2);}
  bake(scene,near,'taipei-street-life',3000,.75);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for(let i=0;i<3;i++) {
      const glint=scene.add.rectangle(650+i*95,199+(i%2)*12,24,2,0xFFF4D8,.4).setScrollFactor(.35);
      scene.tweens.add({targets:glint,x:glint.x+12,alpha:.1,duration:1800+i*400,yoyo:true,repeat:-1});
    }
    const cloud=scene.add.rectangle(290,98,36,5,0xFFF4D8,.65).setScrollFactor(.08);
    scene.tweens.add({targets:cloud,x:325,duration:16000,yoyo:true,repeat:-1});
  }
  for(const [x,y,text] of [[140,130,'北門 · 承恩門'],[460,119,'迪化街 · 茶行與騎樓'],[785,162,'大稻埕 · 淡水河岸']] as const) scene.add.text(x,y,text,{fontFamily:UI_FONT,fontSize:'10px',color:'#355167',backgroundColor:'#FFF4D8',padding:{x:3,y:2}}).setOrigin(.5).setScrollFactor(.35);
  scene.add.text(585,78,'台北101 · 象山意象',{fontFamily:UI_FONT,fontSize:'11px',color:'#355167',backgroundColor:'#FFF4D8',padding:{x:3,y:2}}).setOrigin(.5).setScrollFactor(.1);
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
