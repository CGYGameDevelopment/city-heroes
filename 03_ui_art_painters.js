
function make_art_painter(role) {
  if (role === 'starter')  return paint_starter_art;
  if (role === 'physical') return paint_physical_art;
  if (role === 'magical')  return paint_magical_art;
  if (role === 'tactical') return paint_tactical_art;
  console.warn(`make_art_painter: unknown role '${role}', falling back to paint_physical_art.`);
  return paint_physical_art;
}

function paint_physical_art(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#1a0500');
  bg.addColorStop(1, '#0d0200');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w/2, h, 4, w/2, h, h * 0.8);
  glow.addColorStop(0, 'rgba(220,80,0,0.5)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const blade_top = h * 0.08;
  const blade_bot = h * 0.72;
  const grip_top  = h * 0.72;
  const grip_bot  = h * 0.92;
  const bw = w * 0.06;
  const tip_w = w * 0.01;

  ctx.fillStyle = 'rgba(200,120,40,0.85)';
  ctx.beginPath();
  ctx.moveTo(cx, blade_top);
  ctx.lineTo(cx + tip_w, blade_top + h * 0.04);
  ctx.lineTo(cx + bw, blade_bot);
  ctx.lineTo(cx - bw, blade_bot);
  ctx.lineTo(cx - tip_w, blade_top + h * 0.04);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(180,100,20,0.9)';
  ctx.fillRect(cx - w * 0.22, grip_top - h * 0.02, w * 0.44, h * 0.04);

  ctx.fillStyle = 'rgba(120,60,10,0.9)';
  ctx.fillRect(cx - w * 0.05, grip_top, w * 0.10, grip_bot - grip_top);

  ctx.strokeStyle = 'rgba(255,200,80,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, blade_top);
  ctx.lineTo(cx + bw * 0.3, blade_bot);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,160,0,0.7)';
  for (const [sx, sy] of [[0.2,0.3],[0.75,0.2],[0.15,0.55],[0.8,0.6],[0.4,0.15]]) {
    ctx.fillRect(sx*w - 1, sy*h - 1, 2, 2);
  }
}

function paint_magical_art(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#050015');
  bg.addColorStop(1, '#00000d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w/2, h/2, 2, w/2, h/2, w * 0.42);
  glow.addColorStop(0, 'rgba(140,60,255,0.7)');
  glow.addColorStop(0.5, 'rgba(60,20,180,0.3)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const cx = w/2, cy = h * 0.48, cr = w * 0.32;
  ctx.strokeStyle = 'rgba(160,80,255,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(120,60,220,0.5)';
  ctx.beginPath();
  ctx.arc(cx, cy, cr * 0.6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(180,100,255,0.4)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
    ctx.stroke();
  }

  const orb = ctx.createRadialGradient(cx, cy, 1, cx, cy, w * 0.08);
  orb.addColorStop(0, 'rgba(255,200,255,0.95)');
  orb.addColorStop(1, 'rgba(120,40,220,0)');
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(200,160,255,0.8)';
  for (const [sx, sy] of [[0.1,0.1],[0.85,0.15],[0.2,0.8],[0.78,0.75],[0.05,0.5],[0.92,0.45]]) {
    ctx.fillRect(sx*w - 1, sy*h - 1, 2, 2);
  }
}

function paint_tactical_art(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0a1008');
  bg.addColorStop(1, '#050a04');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(80,100,60,0.25)';
  ctx.lineWidth = 0.5;
  const grid = w * 0.18;
  for (let x = 0; x < w; x += grid) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += grid) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  const cx = w/2, cy = h * 0.46;
  const cr = w * 0.3;

  ctx.strokeStyle = 'rgba(140,160,80,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(160,180,80,0.8)';
  const pts = [[0,-1],[1,0],[0,1],[-1,0]];
  for (const [dx, dy] of pts) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * cr, cy + dy * cr);
    ctx.lineTo(cx + dx * cr * 0.3 - dy * cr * 0.12, cy + dy * cr * 0.3 + dx * cr * 0.12);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * cr * 0.3 + dy * cr * 0.12, cy + dy * cr * 0.3 - dx * cr * 0.12);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(200,220,120,0.95)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - cr);
  ctx.lineTo(cx - cr * 0.12, cy - cr * 0.3);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(180,200,100,0.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.03, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(120,140,60,0.3)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 3]);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();
  ctx.setLineDash([]);
}

function paint_starter_art(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#2a2420');
  bg.addColorStop(1, '#1a1512');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(160,130,60,0.7)';
  ctx.beginPath();
  ctx.arc(w/2, h*0.45, w*0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,170,80,0.9)';
  ctx.beginPath();
  ctx.arc(w/2, h*0.45, w*0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(100,70,10,0.9)';
  ctx.font = `bold ${Math.floor(w * 0.22)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('G', w/2, h*0.46);
}

const big_bad_art = {

  goblin_warchief(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);

    const g = '#4a8c2a', dg = '#2a5c0a', skin = '#6aac3a', eye = '#ff4400', teeth = '#eeeecc';
    const helm = '#888', crown = '#cc8800';

    p(8,2,crown); p(9,1,crown); p(10,2,crown); p(11,1,crown); p(12,2,crown);
    p(7,3,helm); p(8,3,helm); p(9,3,helm); p(10,3,helm); p(11,3,helm); p(12,3,helm); p(13,3,helm);

    for(let x=7;x<=13;x++) for(let y=4;y<=7;y++) p(x,y,skin);

    p(8,5,eye); p(12,5,eye);

    p(9,7,teeth); p(10,7,teeth); p(11,7,teeth);

    for(let x=6;x<=14;x++) for(let y=8;y<=13;y++) p(x,y,g);
    p(6,8,dg); p(14,8,dg); p(6,9,dg); p(14,9,dg);

    p(15,4,'#884400'); p(15,5,'#884400'); p(15,6,'#884400'); p(15,7,'#884400');
    p(15,8,'#884400'); p(15,9,'#884400'); p(16,3,'#aaaaaa'); p(15,3,'#aaaaaa');

    for(let y=8;y<=12;y++) { p(5,y,skin); p(15,y,skin); }

    for(let y=14;y<=17;y++) { p(7,y,dg); p(8,y,dg); p(12,y,dg); p(13,y,dg); }
  },

  plagued_bear(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const fur = '#5a3a1a', dfur = '#3a1a00', snout = '#7a5a3a', eye = '#88ff00', pus = '#88aa00';

    p(5,2,fur); p(6,2,fur); p(13,2,fur); p(14,2,fur);
    p(5,3,fur); p(6,3,fur); p(13,3,fur); p(14,3,fur);

    for(let x=5;x<=14;x++) for(let y=3;y<=8;y++) p(x,y,fur);

    p(8,7,snout); p(9,7,snout); p(10,7,snout); p(11,7,snout);
    p(8,8,snout); p(9,8,snout); p(10,8,snout); p(11,8,snout);

    p(7,5,eye); p(8,5,eye); p(12,5,eye); p(13,5,eye);

    p(6,4,pus); p(11,4,pus); p(9,6,pus); p(13,7,pus);

    for(let x=4;x<=15;x++) for(let y=9;y<=15;y++) p(x,y,fur);
    for(let x=5;x<=14;x++) p(x,16,fur);

    for(let y=14;y<=17;y++) { p(3,y,dfur); p(4,y,dfur); p(15,y,dfur); p(16,y,dfur); }

    p(2,17,'#cccccc'); p(3,17,'#cccccc'); p(16,17,'#cccccc'); p(17,17,'#cccccc');
  },

  iron_golem(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const iron = '#7a8a8a', diron = '#4a5a5a', glow = '#00ccff', bolt = '#cc8800';

    for(let x=6;x<=13;x++) for(let y=1;y<=5;y++) p(x,y,iron);
    p(6,1,diron); p(13,1,diron); p(6,5,diron); p(13,5,diron);

    p(7,3,glow); p(8,3,glow); p(11,3,glow); p(12,3,glow);

    for(let x=7;x<=12;x++) p(x,6,diron);
    for(let x=4;x<=15;x++) for(let y=7;y<=8;y++) p(x,y,iron);

    for(let x=5;x<=14;x++) for(let y=9;y<=15;y++) p(x,y,iron);

    p(9,11,glow); p(10,11,glow); p(9,12,glow); p(10,12,glow);

    p(6,9,bolt); p(13,9,bolt); p(6,14,bolt); p(13,14,bolt);

    for(let y=7;y<=15;y++) { p(3,y,iron); p(4,y,iron); p(15,y,iron); p(16,y,iron); }

    for(let y=15;y<=17;y++) { p(2,y,diron); p(3,y,diron); p(4,y,diron); p(15,y,diron); p(16,y,diron); p(17,y,diron); }

    for(let y=16;y<=17;y++) { p(6,y,iron); p(7,y,iron); p(8,y,iron); p(11,y,iron); p(12,y,iron); p(13,y,iron); }
  },

  serpent_queen(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const scale = '#1a6a3a', dscale = '#0a4a1a', gold = '#ccaa00', eye = '#ffee00', tongue = '#ff2244';

    p(7,0,gold); p(9,0,gold); p(11,0,gold); p(8,1,gold); p(10,1,gold); p(7,2,gold); p(8,2,gold); p(9,2,gold); p(10,2,gold); p(11,2,gold); p(12,2,gold);

    for(let x=6;x<=13;x++) for(let y=2;y<=7;y++) p(x,y,scale);

    for(let x=7;x<=12;x+=2) for(let y=3;y<=6;y+=2) p(x,y,dscale);

    p(7,4,eye); p(8,4,eye); p(11,4,eye); p(12,4,eye);

    p(8,8,tongue); p(9,8,tongue); p(10,8,tongue); p(8,9,tongue); p(11,9,tongue);

    for(let x=5;x<=14;x++) for(let y=9;y<=12;y++) p(x,y,scale);
    for(let x=4;x<=6;x++) for(let y=12;y<=15;y++) p(x,y,scale);
    for(let x=4;x<=12;x++) for(let y=15;y<=16;y++) p(x,y,scale);
    for(let x=12;x<=15;x++) for(let y=12;y<=16;y++) p(x,y,scale);
    for(let y=10;y<=16;y+=2) for(let x=6;x<=13;x+=2) p(x,y,dscale);

    p(4,17,dscale); p(5,17,dscale); p(6,17,dscale);

    p(3,9,dscale); p(3,10,dscale); p(16,9,dscale); p(16,10,dscale);
  },

  wickerman(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const wood = '#5a3a1a', dwood = '#3a1a00', flame = '#cc4400', flame2 = '#ffaa00', skull = '#ccc8b0', smoke = '#444';

    for(let x=7;x<=11;x++) for(let y=2;y<=5;y++) p(x,y,skull);
    p(8,4,dwood); p(10,4,dwood);
    p(9,6,dwood);

    for(let y=6;y<=15;y++) p(9,y,wood);
    for(let x=4;x<=14;x++) p(x,9,wood);

    for(let x=4;x<=14;x++) p(x,16,flame);
    for(let x=5;x<=13;x+=2) p(x,15,flame);
    for(let x=6;x<=12;x+=3) p(x,14,flame2);

    p(6,11,dwood); p(12,11,dwood); p(7,13,dwood); p(11,13,dwood);

    p(3,3,smoke); p(15,3,smoke); p(9,0,smoke); p(9,1,smoke);
  },

  voidweaver(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const dark = '#0a0014', vio = '#3a0066', vio2 = '#6e22ce', star = '#dabbff', eye = '#00ddff';

    for(let x=0;x<=17;x++) for(let y=0;y<=17;y++) p(x,y,dark);

    const cx = 9, cy = 9;
    p(cx, cy, eye);
    for(let r=2;r<=7;r++) {
      const offsets = [[r,0],[-r,0],[0,r],[0,-r],[r,r],[-r,-r],[r,-r],[-r,r]];
      for (const [dx, dy] of offsets) {
        const x = cx+dx, y = cy+dy;
        if (x>=0&&x<=17&&y>=0&&y<=17) p(x, y, r%2===0 ? vio : vio2);
      }
    }

    p(cx,cy,eye); p(cx-1,cy,vio2); p(cx+1,cy,vio2); p(cx,cy-1,vio2); p(cx,cy+1,vio2);

    p(2,2,star); p(15,2,star); p(2,15,star); p(15,15,star); p(8,1,star); p(1,8,star); p(16,8,star); p(8,16,star);
  },

  crimson_tyrant(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const scale = '#8a1010', dscale = '#4a0000', plate = '#bb2020', gold = '#ccaa00', flame = '#ff8800', eye = '#ffff44';

    p(6,1,dscale); p(7,1,dscale); p(11,1,dscale); p(12,1,dscale);
    p(6,2,scale); p(7,2,scale); p(11,2,scale); p(12,2,scale);

    for(let x=6;x<=12;x++) for(let y=3;y<=7;y++) p(x,y,scale);

    p(7,5,eye); p(11,5,eye);

    p(8,7,dscale); p(9,7,dscale); p(10,7,dscale); p(8,8,gold); p(10,8,gold);

    p(7,2,gold); p(9,1,gold); p(11,2,gold);

    for(let x=4;x<=14;x++) for(let y=8;y<=14;y++) p(x,y,plate);
    for(let x=5;x<=13;x+=2) for(let y=9;y<=13;y+=2) p(x,y,dscale);

    p(9,11,gold); p(8,11,gold); p(9,10,gold);

    for(let y=8;y<=14;y++) { p(3,y,plate); p(15,y,plate); }

    p(2,15,flame); p(3,15,flame); p(15,15,flame); p(16,15,flame);
    p(2,16,gold); p(16,16,gold);

    for(let y=15;y<=17;y++) { p(6,y,plate); p(7,y,plate); p(11,y,plate); p(12,y,plate); }

    p(0,5,flame); p(17,6,flame); p(1,12,flame); p(17,13,flame);
  },

  lich_sovereign(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const bone = '#ddd8c4', dbone = '#b8b4a0', purple = '#6600aa', dpurple = '#440077', glow = '#aa44ff', gold = '#ccaa00';

    p(7,0,gold); p(9,0,gold); p(11,0,gold); p(13,0,gold);
    for(let x=6;x<=14;x++) p(x,1,gold);

    for(let x=6;x<=13;x++) for(let y=2;y<=6;y++) p(x,y,bone);

    p(7,4,dpurple); p(8,4,glow); p(11,4,dpurple); p(12,4,glow);

    p(9,5,dpurple); p(10,5,dpurple);

    for(let x=7;x<=12;x+=1) p(x,7,(x%2===0)?bone:dpurple);

    for(let x=5;x<=14;x++) for(let y=8;y<=16;y++) p(x,y,purple);

    for(let x=6;x<=13;x+=2) for(let y=9;y<=15;y+=3) p(x,y,dpurple);

    p(9,10,glow); p(10,10,glow); p(9,11,glow); p(10,11,glow);

    for(let y=8;y<=17;y++) p(16,y,'#884400');
    p(16,7,'#aaaaaa'); p(17,7,'#aaaaaa'); p(15,7,'#aaaaaa');
    p(17,6,glow);

    p(4,13,bone); p(4,14,bone); p(5,14,bone); p(4,15,dbone);
    p(15,13,bone); p(16,13,bone); p(16,14,bone);

    for(let y=12;y<=17;y++) { p(4,y,dpurple); p(15,y,dpurple); }
    p(5,17,dpurple); p(6,17,dpurple); p(13,17,dpurple); p(14,17,dpurple);
  },

};

const city_art = {

  stonehaven(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const stone = '#888070', dstone = '#5a5248', roof = '#6a5040', sky = '#203048', window_c = '#ffee88';

    for(let x=0;x<=17;x++) for(let y=0;y<=9;y++) p(x,y,sky);

    for(let x=4;x<=13;x++) for(let y=6;y<=17;y++) p(x,y,stone);

    p(4,5,stone); p(5,5,stone); p(7,5,stone); p(8,5,stone); p(10,5,stone); p(11,5,stone); p(13,5,stone);
    p(4,4,dstone); p(7,4,dstone); p(10,4,dstone); p(13,4,dstone);

    for(let x=1;x<=5;x++) for(let y=9;y<=17;y++) p(x,y,dstone);
    p(1,8,dstone); p(3,8,dstone); p(5,8,dstone);

    for(let x=12;x<=16;x++) for(let y=9;y<=17;y++) p(x,y,dstone);
    p(12,8,dstone); p(14,8,dstone); p(16,8,dstone);

    p(7,9,window_c); p(8,9,window_c); p(10,9,window_c); p(11,9,window_c);
    p(7,12,window_c); p(8,12,window_c); p(10,12,window_c); p(11,12,window_c);

    for(let x=8;x<=10;x++) for(let y=14;y<=17;y++) p(x,y,'#2a1a0a');

    for(let x=0;x<=17;x++) p(x,17,'#3a3028');
  },

  ironhold(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const iron = '#6a7a7a', diron = '#3a4a4a', mtn = '#4a4040', snow = '#ddd8d0', sky = '#101820', torch = '#ff8800';

    for(let y=0;y<=17;y++) for(let x=0;x<=17;x++) p(x,y,sky);
    p(3,11,mtn); p(4,10,mtn); p(5,9,mtn); p(6,8,mtn); p(7,9,mtn); p(8,10,mtn);
    p(10,8,mtn); p(11,7,mtn); p(12,8,mtn); p(13,9,mtn); p(14,10,mtn); p(15,11,mtn);
    for(let x=0;x<=5;x++) for(let y=11;y<=17;y++) p(x,y,mtn);
    for(let x=13;x<=17;x++) for(let y=10;y<=17;y++) p(x,y,mtn);

    p(6,8,snow); p(11,7,snow); p(12,8,snow);

    for(let x=4;x<=13;x++) for(let y=10;y<=17;y++) p(x,y,iron);

    for(let x=4;x<=13;x+=2) p(x,9,diron);

    for(let x=3;x<=5;x++) for(let y=7;y<=11;y++) p(x,y,diron);
    for(let x=12;x<=14;x++) for(let y=7;y<=11;y++) p(x,y,diron);

    p(4,6,torch); p(13,6,torch);

    for(let x=8;x<=10;x++) for(let y=13;y<=17;y++) p(x,y,'#1a1010');

    p(8,13,'#555'); p(9,13,'#555'); p(10,13,'#555');
  },

  duskwater(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const wood = '#6a4a2a', dwoof = '#4a2a0a', sail = '#e8dcc0', water = '#1a3a5a', dwater = '#0a2a4a', sky = '#1a2a4a', mast = '#5a3a1a';

    for(let y=0;y<=8;y++) for(let x=0;x<=17;x++) p(x,y,sky);
    for(let y=12;y<=17;y++) for(let x=0;x<=17;x++) p(x,y,(y%2===0)?water:dwater);

    for(let x=0;x<=17;x++) for(let y=11;y<=13;y++) p(x,y,wood);
    for(let x=0;x<=3;x++) for(let y=9;y<=12;y++) p(x,y,dwoof);
    for(let x=14;x<=17;x++) for(let y=9;y<=12;y++) p(x,y,dwoof);

    for(let x=4;x<=8;x++) for(let y=6;y<=11;y++) p(x,y,wood);
    for(let x=9;x<=13;x++) for(let y=7;y<=11;y++) p(x,y,dwoof);

    for(let x=3;x<=9;x++) p(x,5,'#8a5a3a');
    p(4,4,'#8a5a3a'); p(5,4,'#8a5a3a'); p(6,3,'#8a5a3a'); p(7,4,'#8a5a3a'); p(8,4,'#8a5a3a');

    for(let y=2;y<=11;y++) p(15,y,mast);

    for(let x=12;x<=14;x++) for(let y=3;y<=8;y++) p(x,y,sail);

    for(let x=1;x<=16;x+=3) p(x,14,'#4a6a8a'); for(let x=2;x<=15;x+=4) p(x,16,'#4a6a8a');
  },

  ashenveil(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const ash = '#5a4a4a', dash = '#3a2a2a', curse = '#8800aa', fire = '#cc4400', skull = '#ccc8b0', sky = '#0a0808';

    for(let y=0;y<=17;y++) for(let x=0;x<=17;x++) p(x,y,sky);

    for(let x=2;x<=7;x++) for(let y=8;y<=17;y++) p(x,y,ash);
    for(let x=10;x<=15;x++) for(let y=10;y<=17;y++) p(x,y,ash);

    p(2,7,ash); p(4,6,ash); p(6,5,ash); p(7,7,ash);
    p(10,9,ash); p(12,8,ash); p(14,7,ash); p(15,9,ash);

    p(8,11,curse); p(9,11,curse); p(8,12,curse); p(9,12,curse);
    p(8,10,curse); p(9,10,curse); p(7,12,curse); p(10,12,curse);

    p(1,6,skull); p(1,5,skull); p(16,7,skull); p(16,6,skull);
    p(0,7,'#5a3a2a'); p(17,8,'#5a3a2a');

    p(3,7,fire); p(11,8,fire); p(5,9,fire); p(14,9,fire);

    for(let x=0;x<=17;x++) p(x,17,dash);
    p(4,16,sky); p(8,16,sky); p(12,16,sky); p(5,17,sky); p(11,17,sky);
  },

  gilded_reach(canvas) {
    const ctx = canvas.getContext('2d');
    const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x*4, y*4, 4, 4); };
    ctx.clearRect(0, 0, 72, 72);
    const gold = '#ccaa00', lgold = '#eecc44', marble = '#e8e0d0', dmarble = '#c0b8a8', sky = '#1a2a4a', window_c = '#88ccff';

    for(let y=0;y<=7;y++) for(let x=0;x<=17;x++) p(x,y,sky);

    for(let x=2;x<=15;x++) for(let y=5;y<=17;y++) p(x,y,marble);

    for(let y=7;y<=16;y++) { p(3,y,dmarble); p(4,y,dmarble); p(8,y,dmarble); p(9,y,dmarble); p(13,y,dmarble); p(14,y,dmarble); }

    for(let x=1;x<=16;x++) p(x,4,gold);
    p(1,3,gold); p(16,3,gold);
    p(2,3,lgold); p(15,3,lgold);
    for(let x=3;x<=14;x++) p(x,3,marble);
    p(5,2,lgold); p(12,2,lgold); p(8,1,lgold); p(9,1,lgold);

    p(5,9,window_c); p(6,9,window_c); p(11,9,window_c); p(12,9,window_c);
    p(5,12,window_c); p(6,12,window_c); p(11,12,window_c); p(12,12,window_c);

    p(8,0,lgold); p(9,0,lgold);

    for(let x=7;x<=10;x++) for(let y=14;y<=17;y++) p(x,y,dmarble);
    for(let x=7;x<=10;x++) p(x,13,gold);

    p(1,17,gold); p(5,17,lgold); p(12,17,gold); p(16,17,lgold);
  },

};

const SPRITE_NATIVE_SIZE = 72;

function paint_sprite(canvas, painter) {
  if (!painter) {
    const draw_ctx = canvas.getContext('2d');
    const fw = canvas.width, fh = canvas.height;
    draw_ctx.clearRect(0, 0, fw, fh);
    draw_ctx.fillStyle = '#ff0000';
    draw_ctx.font      = `${Math.floor(fw * 0.28)}px sans-serif`;
    draw_ctx.textAlign    = 'center';
    draw_ctx.textBaseline = 'middle';
    draw_ctx.fillText('?', fw / 2, fh / 2);
    return;
  }
  painter(canvas);
}

function paint_sprite_scaled(canvas, painter, target_width, target_height, native_size = SPRITE_NATIVE_SIZE) {
  const offscreen_canvas   = document.createElement('canvas');
  offscreen_canvas.width   = native_size;
  offscreen_canvas.height  = native_size;
  paint_sprite(offscreen_canvas, painter);
  canvas.width  = target_width;
  canvas.height = target_height;
  const draw_ctx = canvas.getContext('2d');
  draw_ctx.clearRect(0, 0, target_width, target_height);
  draw_ctx.imageSmoothingEnabled = false;
  draw_ctx.drawImage(offscreen_canvas, 0, 0, target_width, target_height);
}
