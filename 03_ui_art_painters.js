
const SPRITE_NATIVE_SIZE      = 72;
const PIXEL_TO_CANVAS_SCALE   = 4;
const SPRITE_GRID_SIZE        = SPRITE_NATIVE_SIZE / PIXEL_TO_CANVAS_SCALE;
const SPRITE_GRID_MAX_INDEX   = SPRITE_GRID_SIZE - 1;
const FALLBACK_FONT_SCALE     = 0.28;

function make_art_painter(role) {
  if (role === 'starter')  return paint_starter_art;
  if (role === 'physical') return paint_physical_art;
  if (role === 'magical')  return paint_magical_art;
  if (role === 'tactical') return paint_tactical_art;
  console.warn(`make_art_painter: unknown role '${role}', falling back to paint_physical_art.`);
  return paint_physical_art;
}

function paint_physical_art(canvas) {
  const canvas_ctx    = canvas.getContext('2d');
  const canvas_width  = canvas.width;
  const canvas_height = canvas.height;
  canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);

  const background_gradient = canvas_ctx.createLinearGradient(0, 0, 0, canvas_height);
  background_gradient.addColorStop(0, '#1a0500');
  background_gradient.addColorStop(1, '#0d0200');
  canvas_ctx.fillStyle = background_gradient;
  canvas_ctx.fillRect(0, 0, canvas_width, canvas_height);

  const glow_gradient = canvas_ctx.createRadialGradient(
    canvas_width / 2, canvas_height, 4,
    canvas_width / 2, canvas_height, canvas_height * 0.8
  );
  glow_gradient.addColorStop(0, 'rgba(220,80,0,0.5)');
  glow_gradient.addColorStop(1, 'rgba(0,0,0,0)');
  canvas_ctx.fillStyle = glow_gradient;
  canvas_ctx.fillRect(0, 0, canvas_width, canvas_height);

  const center_x       = canvas_width / 2;
  const blade_top      = canvas_height * 0.08;
  const blade_bottom   = canvas_height * 0.72;
  const grip_top       = canvas_height * 0.72;
  const grip_bottom    = canvas_height * 0.92;
  const blade_width    = canvas_width * 0.06;
  const blade_tip_width = canvas_width * 0.01;

  canvas_ctx.fillStyle = 'rgba(200,120,40,0.85)';
  canvas_ctx.beginPath();
  canvas_ctx.moveTo(center_x, blade_top);
  canvas_ctx.lineTo(center_x + blade_tip_width, blade_top + canvas_height * 0.04);
  canvas_ctx.lineTo(center_x + blade_width, blade_bottom);
  canvas_ctx.lineTo(center_x - blade_width, blade_bottom);
  canvas_ctx.lineTo(center_x - blade_tip_width, blade_top + canvas_height * 0.04);
  canvas_ctx.closePath();
  canvas_ctx.fill();

  canvas_ctx.fillStyle = 'rgba(180,100,20,0.9)';
  canvas_ctx.fillRect(center_x - canvas_width * 0.22, grip_top - canvas_height * 0.02, canvas_width * 0.44, canvas_height * 0.04);

  canvas_ctx.fillStyle = 'rgba(120,60,10,0.9)';
  canvas_ctx.fillRect(center_x - canvas_width * 0.05, grip_top, canvas_width * 0.10, grip_bottom - grip_top);

  canvas_ctx.strokeStyle = 'rgba(255,200,80,0.5)';
  canvas_ctx.lineWidth = 1;
  canvas_ctx.beginPath();
  canvas_ctx.moveTo(center_x, blade_top);
  canvas_ctx.lineTo(center_x + blade_width * 0.3, blade_bottom);
  canvas_ctx.stroke();

  canvas_ctx.fillStyle = 'rgba(255,160,0,0.7)';
  const spark_positions = [[0.2,0.3],[0.75,0.2],[0.15,0.55],[0.8,0.6],[0.4,0.15]];
  for (const [spark_x_fraction, spark_y_fraction] of spark_positions) {
    canvas_ctx.fillRect(spark_x_fraction * canvas_width - 1, spark_y_fraction * canvas_height - 1, 2, 2);
  }
}

function paint_magical_art(canvas) {
  const canvas_ctx    = canvas.getContext('2d');
  const canvas_width  = canvas.width;
  const canvas_height = canvas.height;
  canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);

  const background_gradient = canvas_ctx.createLinearGradient(0, 0, 0, canvas_height);
  background_gradient.addColorStop(0, '#050015');
  background_gradient.addColorStop(1, '#00000d');
  canvas_ctx.fillStyle = background_gradient;
  canvas_ctx.fillRect(0, 0, canvas_width, canvas_height);

  const glow_gradient = canvas_ctx.createRadialGradient(
    canvas_width / 2, canvas_height / 2, 2,
    canvas_width / 2, canvas_height / 2, canvas_width * 0.42
  );
  glow_gradient.addColorStop(0,   'rgba(140,60,255,0.7)');
  glow_gradient.addColorStop(0.5, 'rgba(60,20,180,0.3)');
  glow_gradient.addColorStop(1,   'rgba(0,0,0,0)');
  canvas_ctx.fillStyle = glow_gradient;
  canvas_ctx.fillRect(0, 0, canvas_width, canvas_height);

  const center_x = canvas_width / 2;
  const center_y = canvas_height * 0.48;
  const ring_radius = canvas_width * 0.32;
  canvas_ctx.strokeStyle = 'rgba(160,80,255,0.7)';
  canvas_ctx.lineWidth = 1;
  canvas_ctx.beginPath();
  canvas_ctx.arc(center_x, center_y, ring_radius, 0, Math.PI * 2);
  canvas_ctx.stroke();

  canvas_ctx.strokeStyle = 'rgba(120,60,220,0.5)';
  canvas_ctx.beginPath();
  canvas_ctx.arc(center_x, center_y, ring_radius * 0.6, 0, Math.PI * 2);
  canvas_ctx.stroke();

  canvas_ctx.strokeStyle = 'rgba(180,100,255,0.4)';
  const RUNE_RAY_COUNT = 6;
  for (let ray_index = 0; ray_index < RUNE_RAY_COUNT; ray_index++) {
    const ray_angle = (ray_index / RUNE_RAY_COUNT) * Math.PI * 2;
    canvas_ctx.beginPath();
    canvas_ctx.moveTo(center_x, center_y);
    canvas_ctx.lineTo(center_x + Math.cos(ray_angle) * ring_radius, center_y + Math.sin(ray_angle) * ring_radius);
    canvas_ctx.stroke();
  }

  const orb_gradient = canvas_ctx.createRadialGradient(center_x, center_y, 1, center_x, center_y, canvas_width * 0.08);
  orb_gradient.addColorStop(0, 'rgba(255,200,255,0.95)');
  orb_gradient.addColorStop(1, 'rgba(120,40,220,0)');
  canvas_ctx.fillStyle = orb_gradient;
  canvas_ctx.beginPath();
  canvas_ctx.arc(center_x, center_y, canvas_width * 0.08, 0, Math.PI * 2);
  canvas_ctx.fill();

  canvas_ctx.fillStyle = 'rgba(200,160,255,0.8)';
  const spark_positions = [[0.1,0.1],[0.85,0.15],[0.2,0.8],[0.78,0.75],[0.05,0.5],[0.92,0.45]];
  for (const [spark_x_fraction, spark_y_fraction] of spark_positions) {
    canvas_ctx.fillRect(spark_x_fraction * canvas_width - 1, spark_y_fraction * canvas_height - 1, 2, 2);
  }
}

function paint_tactical_art(canvas) {
  const canvas_ctx    = canvas.getContext('2d');
  const canvas_width  = canvas.width;
  const canvas_height = canvas.height;
  canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);

  const background_gradient = canvas_ctx.createLinearGradient(0, 0, 0, canvas_height);
  background_gradient.addColorStop(0, '#0a1008');
  background_gradient.addColorStop(1, '#050a04');
  canvas_ctx.fillStyle = background_gradient;
  canvas_ctx.fillRect(0, 0, canvas_width, canvas_height);

  canvas_ctx.strokeStyle = 'rgba(80,100,60,0.25)';
  canvas_ctx.lineWidth = 0.5;
  const grid_spacing = canvas_width * 0.18;
  for (let grid_x = 0; grid_x < canvas_width; grid_x += grid_spacing) {
    canvas_ctx.beginPath(); canvas_ctx.moveTo(grid_x, 0); canvas_ctx.lineTo(grid_x, canvas_height); canvas_ctx.stroke();
  }
  for (let grid_y = 0; grid_y < canvas_height; grid_y += grid_spacing) {
    canvas_ctx.beginPath(); canvas_ctx.moveTo(0, grid_y); canvas_ctx.lineTo(canvas_width, grid_y); canvas_ctx.stroke();
  }

  const center_x = canvas_width / 2;
  const center_y = canvas_height * 0.46;
  const compass_radius = canvas_width * 0.3;

  canvas_ctx.strokeStyle = 'rgba(140,160,80,0.5)';
  canvas_ctx.lineWidth = 1;
  canvas_ctx.beginPath();
  canvas_ctx.arc(center_x, center_y, compass_radius, 0, Math.PI * 2);
  canvas_ctx.stroke();

  canvas_ctx.fillStyle = 'rgba(160,180,80,0.8)';
  const compass_points = [[0,-1],[1,0],[0,1],[-1,0]];
  for (const [direction_x, direction_y] of compass_points) {
    canvas_ctx.beginPath();
    canvas_ctx.moveTo(center_x + direction_x * compass_radius, center_y + direction_y * compass_radius);
    canvas_ctx.lineTo(
      center_x + direction_x * compass_radius * 0.3 - direction_y * compass_radius * 0.12,
      center_y + direction_y * compass_radius * 0.3 + direction_x * compass_radius * 0.12
    );
    canvas_ctx.lineTo(center_x, center_y);
    canvas_ctx.lineTo(
      center_x + direction_x * compass_radius * 0.3 + direction_y * compass_radius * 0.12,
      center_y + direction_y * compass_radius * 0.3 - direction_x * compass_radius * 0.12
    );
    canvas_ctx.closePath();
    canvas_ctx.fill();
  }

  canvas_ctx.fillStyle = 'rgba(200,220,120,0.95)';
  canvas_ctx.beginPath();
  canvas_ctx.moveTo(center_x, center_y - compass_radius);
  canvas_ctx.lineTo(center_x - compass_radius * 0.12, center_y - compass_radius * 0.3);
  canvas_ctx.lineTo(center_x, center_y);
  canvas_ctx.closePath();
  canvas_ctx.fill();

  canvas_ctx.fillStyle = 'rgba(180,200,100,0.9)';
  canvas_ctx.beginPath();
  canvas_ctx.arc(center_x, center_y, canvas_width * 0.03, 0, Math.PI * 2);
  canvas_ctx.fill();

  canvas_ctx.strokeStyle = 'rgba(120,140,60,0.3)';
  canvas_ctx.lineWidth = 0.5;
  canvas_ctx.setLineDash([2, 3]);
  canvas_ctx.beginPath(); canvas_ctx.moveTo(0, 0);            canvas_ctx.lineTo(canvas_width, canvas_height); canvas_ctx.stroke();
  canvas_ctx.beginPath(); canvas_ctx.moveTo(canvas_width, 0); canvas_ctx.lineTo(0, canvas_height);            canvas_ctx.stroke();
  canvas_ctx.setLineDash([]);
}

function paint_starter_art(canvas) {
  const canvas_ctx    = canvas.getContext('2d');
  const canvas_width  = canvas.width;
  const canvas_height = canvas.height;
  canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);

  const background_gradient = canvas_ctx.createLinearGradient(0, 0, 0, canvas_height);
  background_gradient.addColorStop(0, '#2a2420');
  background_gradient.addColorStop(1, '#1a1512');
  canvas_ctx.fillStyle = background_gradient;
  canvas_ctx.fillRect(0, 0, canvas_width, canvas_height);

  canvas_ctx.fillStyle = 'rgba(160,130,60,0.7)';
  canvas_ctx.beginPath();
  canvas_ctx.arc(canvas_width / 2, canvas_height * 0.45, canvas_width * 0.22, 0, Math.PI * 2);
  canvas_ctx.fill();
  canvas_ctx.fillStyle = 'rgba(200,170,80,0.9)';
  canvas_ctx.beginPath();
  canvas_ctx.arc(canvas_width / 2, canvas_height * 0.45, canvas_width * 0.15, 0, Math.PI * 2);
  canvas_ctx.fill();

  canvas_ctx.fillStyle    = 'rgba(100,70,10,0.9)';
  canvas_ctx.font         = `bold ${Math.floor(canvas_width * 0.22)}px serif`;
  canvas_ctx.textAlign    = 'center';
  canvas_ctx.textBaseline = 'middle';
  canvas_ctx.fillText('G', canvas_width / 2, canvas_height * 0.46);
}

function make_pixel_painter(canvas_ctx) {
  return (grid_x, grid_y, color) => {
    canvas_ctx.fillStyle = color;
    canvas_ctx.fillRect(grid_x * PIXEL_TO_CANVAS_SCALE, grid_y * PIXEL_TO_CANVAS_SCALE, PIXEL_TO_CANVAS_SCALE, PIXEL_TO_CANVAS_SCALE);
  };
}

const big_bad_art = {

  goblin_warchief(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);

    const green = '#4a8c2a', dark_green = '#2a5c0a', skin = '#6aac3a', eye = '#ff4400', teeth = '#eeeecc';
    const helm = '#888', crown = '#cc8800';

    paint_pixel(8,2,crown); paint_pixel(9,1,crown); paint_pixel(10,2,crown); paint_pixel(11,1,crown); paint_pixel(12,2,crown);
    paint_pixel(7,3,helm); paint_pixel(8,3,helm); paint_pixel(9,3,helm); paint_pixel(10,3,helm); paint_pixel(11,3,helm); paint_pixel(12,3,helm); paint_pixel(13,3,helm);

    for (let grid_x = 7; grid_x <= 13; grid_x++) for (let grid_y = 4; grid_y <= 7; grid_y++) paint_pixel(grid_x, grid_y, skin);

    paint_pixel(8,5,eye); paint_pixel(12,5,eye);

    paint_pixel(9,7,teeth); paint_pixel(10,7,teeth); paint_pixel(11,7,teeth);

    for (let grid_x = 6; grid_x <= 14; grid_x++) for (let grid_y = 8; grid_y <= 13; grid_y++) paint_pixel(grid_x, grid_y, green);
    paint_pixel(6,8,dark_green); paint_pixel(14,8,dark_green); paint_pixel(6,9,dark_green); paint_pixel(14,9,dark_green);

    paint_pixel(15,4,'#884400'); paint_pixel(15,5,'#884400'); paint_pixel(15,6,'#884400'); paint_pixel(15,7,'#884400');
    paint_pixel(15,8,'#884400'); paint_pixel(15,9,'#884400'); paint_pixel(16,3,'#aaaaaa'); paint_pixel(15,3,'#aaaaaa');

    for (let grid_y = 8; grid_y <= 12; grid_y++) { paint_pixel(5, grid_y, skin); paint_pixel(15, grid_y, skin); }

    for (let grid_y = 14; grid_y <= 17; grid_y++) { paint_pixel(7, grid_y, dark_green); paint_pixel(8, grid_y, dark_green); paint_pixel(12, grid_y, dark_green); paint_pixel(13, grid_y, dark_green); }
  },

  plagued_bear(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const fur = '#5a3a1a', dark_fur = '#3a1a00', snout = '#7a5a3a', eye = '#88ff00', pus = '#88aa00';

    paint_pixel(5,2,fur); paint_pixel(6,2,fur); paint_pixel(13,2,fur); paint_pixel(14,2,fur);
    paint_pixel(5,3,fur); paint_pixel(6,3,fur); paint_pixel(13,3,fur); paint_pixel(14,3,fur);

    for (let grid_x = 5; grid_x <= 14; grid_x++) for (let grid_y = 3; grid_y <= 8; grid_y++) paint_pixel(grid_x, grid_y, fur);

    paint_pixel(8,7,snout); paint_pixel(9,7,snout); paint_pixel(10,7,snout); paint_pixel(11,7,snout);
    paint_pixel(8,8,snout); paint_pixel(9,8,snout); paint_pixel(10,8,snout); paint_pixel(11,8,snout);

    paint_pixel(7,5,eye); paint_pixel(8,5,eye); paint_pixel(12,5,eye); paint_pixel(13,5,eye);

    paint_pixel(6,4,pus); paint_pixel(11,4,pus); paint_pixel(9,6,pus); paint_pixel(13,7,pus);

    for (let grid_x = 4; grid_x <= 15; grid_x++) for (let grid_y = 9; grid_y <= 15; grid_y++) paint_pixel(grid_x, grid_y, fur);
    for (let grid_x = 5; grid_x <= 14; grid_x++) paint_pixel(grid_x, 16, fur);

    for (let grid_y = 14; grid_y <= 17; grid_y++) { paint_pixel(3, grid_y, dark_fur); paint_pixel(4, grid_y, dark_fur); paint_pixel(15, grid_y, dark_fur); paint_pixel(16, grid_y, dark_fur); }

    paint_pixel(2,17,'#cccccc'); paint_pixel(3,17,'#cccccc'); paint_pixel(16,17,'#cccccc'); paint_pixel(17,17,'#cccccc');
  },

  iron_golem(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const iron = '#7a8a8a', dark_iron = '#4a5a5a', glow = '#00ccff', bolt = '#cc8800';

    for (let grid_x = 6; grid_x <= 13; grid_x++) for (let grid_y = 1; grid_y <= 5; grid_y++) paint_pixel(grid_x, grid_y, iron);
    paint_pixel(6,1,dark_iron); paint_pixel(13,1,dark_iron); paint_pixel(6,5,dark_iron); paint_pixel(13,5,dark_iron);

    paint_pixel(7,3,glow); paint_pixel(8,3,glow); paint_pixel(11,3,glow); paint_pixel(12,3,glow);

    for (let grid_x = 7; grid_x <= 12; grid_x++) paint_pixel(grid_x, 6, dark_iron);
    for (let grid_x = 4; grid_x <= 15; grid_x++) for (let grid_y = 7; grid_y <= 8; grid_y++) paint_pixel(grid_x, grid_y, iron);

    for (let grid_x = 5; grid_x <= 14; grid_x++) for (let grid_y = 9; grid_y <= 15; grid_y++) paint_pixel(grid_x, grid_y, iron);

    paint_pixel(9,11,glow); paint_pixel(10,11,glow); paint_pixel(9,12,glow); paint_pixel(10,12,glow);

    paint_pixel(6,9,bolt); paint_pixel(13,9,bolt); paint_pixel(6,14,bolt); paint_pixel(13,14,bolt);

    for (let grid_y = 7; grid_y <= 15; grid_y++) { paint_pixel(3, grid_y, iron); paint_pixel(4, grid_y, iron); paint_pixel(15, grid_y, iron); paint_pixel(16, grid_y, iron); }

    for (let grid_y = 15; grid_y <= 17; grid_y++) { paint_pixel(2, grid_y, dark_iron); paint_pixel(3, grid_y, dark_iron); paint_pixel(4, grid_y, dark_iron); paint_pixel(15, grid_y, dark_iron); paint_pixel(16, grid_y, dark_iron); paint_pixel(17, grid_y, dark_iron); }

    for (let grid_y = 16; grid_y <= 17; grid_y++) { paint_pixel(6, grid_y, iron); paint_pixel(7, grid_y, iron); paint_pixel(8, grid_y, iron); paint_pixel(11, grid_y, iron); paint_pixel(12, grid_y, iron); paint_pixel(13, grid_y, iron); }
  },

  serpent_queen(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const scale = '#1a6a3a', dark_scale = '#0a4a1a', gold = '#ccaa00', eye = '#ffee00', tongue = '#ff2244';

    paint_pixel(7,0,gold); paint_pixel(9,0,gold); paint_pixel(11,0,gold);
    paint_pixel(8,1,gold); paint_pixel(10,1,gold);
    paint_pixel(7,2,gold); paint_pixel(8,2,gold); paint_pixel(9,2,gold); paint_pixel(10,2,gold); paint_pixel(11,2,gold); paint_pixel(12,2,gold);

    for (let grid_x = 6; grid_x <= 13; grid_x++) for (let grid_y = 2; grid_y <= 7; grid_y++) paint_pixel(grid_x, grid_y, scale);

    for (let grid_x = 7; grid_x <= 12; grid_x += 2) for (let grid_y = 3; grid_y <= 6; grid_y += 2) paint_pixel(grid_x, grid_y, dark_scale);

    paint_pixel(7,4,eye); paint_pixel(8,4,eye); paint_pixel(11,4,eye); paint_pixel(12,4,eye);

    paint_pixel(8,8,tongue); paint_pixel(9,8,tongue); paint_pixel(10,8,tongue); paint_pixel(8,9,tongue); paint_pixel(11,9,tongue);

    for (let grid_x = 5;  grid_x <= 14; grid_x++) for (let grid_y = 9;  grid_y <= 12; grid_y++) paint_pixel(grid_x, grid_y, scale);
    for (let grid_x = 4;  grid_x <= 6;  grid_x++) for (let grid_y = 12; grid_y <= 15; grid_y++) paint_pixel(grid_x, grid_y, scale);
    for (let grid_x = 4;  grid_x <= 12; grid_x++) for (let grid_y = 15; grid_y <= 16; grid_y++) paint_pixel(grid_x, grid_y, scale);
    for (let grid_x = 12; grid_x <= 15; grid_x++) for (let grid_y = 12; grid_y <= 16; grid_y++) paint_pixel(grid_x, grid_y, scale);
    for (let grid_y = 10; grid_y <= 16; grid_y += 2) for (let grid_x = 6; grid_x <= 13; grid_x += 2) paint_pixel(grid_x, grid_y, dark_scale);

    paint_pixel(4,17,dark_scale); paint_pixel(5,17,dark_scale); paint_pixel(6,17,dark_scale);

    paint_pixel(3,9,dark_scale); paint_pixel(3,10,dark_scale); paint_pixel(16,9,dark_scale); paint_pixel(16,10,dark_scale);
  },

  wickerman(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const wood = '#5a3a1a', dark_wood = '#3a1a00', flame = '#cc4400', bright_flame = '#ffaa00', skull = '#ccc8b0', smoke = '#444';

    for (let grid_x = 7; grid_x <= 11; grid_x++) for (let grid_y = 2; grid_y <= 5; grid_y++) paint_pixel(grid_x, grid_y, skull);
    paint_pixel(8,4,dark_wood); paint_pixel(10,4,dark_wood);
    paint_pixel(9,6,dark_wood);

    for (let grid_y = 6; grid_y <= 15; grid_y++) paint_pixel(9, grid_y, wood);
    for (let grid_x = 4; grid_x <= 14; grid_x++) paint_pixel(grid_x, 9, wood);

    for (let grid_x = 4; grid_x <= 14; grid_x++) paint_pixel(grid_x, 16, flame);
    for (let grid_x = 5; grid_x <= 13; grid_x += 2) paint_pixel(grid_x, 15, flame);
    for (let grid_x = 6; grid_x <= 12; grid_x += 3) paint_pixel(grid_x, 14, bright_flame);

    paint_pixel(6,11,dark_wood); paint_pixel(12,11,dark_wood); paint_pixel(7,13,dark_wood); paint_pixel(11,13,dark_wood);

    paint_pixel(3,3,smoke); paint_pixel(15,3,smoke); paint_pixel(9,0,smoke); paint_pixel(9,1,smoke);
  },

  voidweaver(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const dark = '#0a0014', violet = '#3a0066', violet_bright = '#6e22ce', star = '#dabbff', eye = '#00ddff';

    for (let grid_x = 0; grid_x <= SPRITE_GRID_MAX_INDEX; grid_x++) {
      for (let grid_y = 0; grid_y <= SPRITE_GRID_MAX_INDEX; grid_y++) paint_pixel(grid_x, grid_y, dark);
    }

    const center_grid_x = 9, center_grid_y = 9;
    paint_pixel(center_grid_x, center_grid_y, eye);
    const PORTAL_RING_MIN_RADIUS = 2;
    const PORTAL_RING_MAX_RADIUS = 7;
    for (let ring_radius = PORTAL_RING_MIN_RADIUS; ring_radius <= PORTAL_RING_MAX_RADIUS; ring_radius++) {
      const ring_offsets = [
        [ ring_radius, 0], [-ring_radius, 0], [0,  ring_radius], [0, -ring_radius],
        [ ring_radius,  ring_radius], [-ring_radius, -ring_radius],
        [ ring_radius, -ring_radius], [-ring_radius,  ring_radius],
      ];
      for (const [delta_x, delta_y] of ring_offsets) {
        const pixel_x = center_grid_x + delta_x, pixel_y = center_grid_y + delta_y;
        if (pixel_x >= 0 && pixel_x <= SPRITE_GRID_MAX_INDEX && pixel_y >= 0 && pixel_y <= SPRITE_GRID_MAX_INDEX) {
          paint_pixel(pixel_x, pixel_y, ring_radius % 2 === 0 ? violet : violet_bright);
        }
      }
    }

    paint_pixel(center_grid_x, center_grid_y, eye);
    paint_pixel(center_grid_x - 1, center_grid_y, violet_bright);
    paint_pixel(center_grid_x + 1, center_grid_y, violet_bright);
    paint_pixel(center_grid_x, center_grid_y - 1, violet_bright);
    paint_pixel(center_grid_x, center_grid_y + 1, violet_bright);

    paint_pixel(2,2,star); paint_pixel(15,2,star); paint_pixel(2,15,star); paint_pixel(15,15,star);
    paint_pixel(8,1,star); paint_pixel(1,8,star); paint_pixel(16,8,star); paint_pixel(8,16,star);
  },

  crimson_tyrant(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const scale = '#8a1010', dark_scale = '#4a0000', plate = '#bb2020', gold = '#ccaa00', flame = '#ff8800', eye = '#ffff44';

    paint_pixel(6,1,dark_scale); paint_pixel(7,1,dark_scale); paint_pixel(11,1,dark_scale); paint_pixel(12,1,dark_scale);
    paint_pixel(6,2,scale); paint_pixel(7,2,scale); paint_pixel(11,2,scale); paint_pixel(12,2,scale);

    for (let grid_x = 6; grid_x <= 12; grid_x++) for (let grid_y = 3; grid_y <= 7; grid_y++) paint_pixel(grid_x, grid_y, scale);

    paint_pixel(7,5,eye); paint_pixel(11,5,eye);

    paint_pixel(8,7,dark_scale); paint_pixel(9,7,dark_scale); paint_pixel(10,7,dark_scale); paint_pixel(8,8,gold); paint_pixel(10,8,gold);

    paint_pixel(7,2,gold); paint_pixel(9,1,gold); paint_pixel(11,2,gold);

    for (let grid_x = 4; grid_x <= 14; grid_x++) for (let grid_y = 8; grid_y <= 14; grid_y++) paint_pixel(grid_x, grid_y, plate);
    for (let grid_x = 5; grid_x <= 13; grid_x += 2) for (let grid_y = 9; grid_y <= 13; grid_y += 2) paint_pixel(grid_x, grid_y, dark_scale);

    paint_pixel(9,11,gold); paint_pixel(8,11,gold); paint_pixel(9,10,gold);

    for (let grid_y = 8; grid_y <= 14; grid_y++) { paint_pixel(3, grid_y, plate); paint_pixel(15, grid_y, plate); }

    paint_pixel(2,15,flame); paint_pixel(3,15,flame); paint_pixel(15,15,flame); paint_pixel(16,15,flame);
    paint_pixel(2,16,gold); paint_pixel(16,16,gold);

    for (let grid_y = 15; grid_y <= 17; grid_y++) { paint_pixel(6, grid_y, plate); paint_pixel(7, grid_y, plate); paint_pixel(11, grid_y, plate); paint_pixel(12, grid_y, plate); }

    paint_pixel(0,5,flame); paint_pixel(17,6,flame); paint_pixel(1,12,flame); paint_pixel(17,13,flame);
  },

  lich_sovereign(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const bone = '#ddd8c4', dark_bone = '#b8b4a0', purple = '#6600aa', dark_purple = '#440077', glow = '#aa44ff', gold = '#ccaa00';

    paint_pixel(7,0,gold); paint_pixel(9,0,gold); paint_pixel(11,0,gold); paint_pixel(13,0,gold);
    for (let grid_x = 6; grid_x <= 14; grid_x++) paint_pixel(grid_x, 1, gold);

    for (let grid_x = 6; grid_x <= 13; grid_x++) for (let grid_y = 2; grid_y <= 6; grid_y++) paint_pixel(grid_x, grid_y, bone);

    paint_pixel(7,4,dark_purple); paint_pixel(8,4,glow); paint_pixel(11,4,dark_purple); paint_pixel(12,4,glow);

    paint_pixel(9,5,dark_purple); paint_pixel(10,5,dark_purple);

    for (let grid_x = 7; grid_x <= 12; grid_x++) paint_pixel(grid_x, 7, (grid_x % 2 === 0) ? bone : dark_purple);

    for (let grid_x = 5; grid_x <= 14; grid_x++) for (let grid_y = 8; grid_y <= 16; grid_y++) paint_pixel(grid_x, grid_y, purple);

    for (let grid_x = 6; grid_x <= 13; grid_x += 2) for (let grid_y = 9; grid_y <= 15; grid_y += 3) paint_pixel(grid_x, grid_y, dark_purple);

    paint_pixel(9,10,glow); paint_pixel(10,10,glow); paint_pixel(9,11,glow); paint_pixel(10,11,glow);

    for (let grid_y = 8; grid_y <= 17; grid_y++) paint_pixel(16, grid_y, '#884400');
    paint_pixel(16,7,'#aaaaaa'); paint_pixel(17,7,'#aaaaaa'); paint_pixel(15,7,'#aaaaaa');
    paint_pixel(17,6,glow);

    paint_pixel(4,13,bone); paint_pixel(4,14,bone); paint_pixel(5,14,bone); paint_pixel(4,15,dark_bone);
    paint_pixel(15,13,bone); paint_pixel(16,13,bone); paint_pixel(16,14,bone);

    for (let grid_y = 12; grid_y <= 17; grid_y++) { paint_pixel(4, grid_y, dark_purple); paint_pixel(15, grid_y, dark_purple); }
    paint_pixel(5,17,dark_purple); paint_pixel(6,17,dark_purple); paint_pixel(13,17,dark_purple); paint_pixel(14,17,dark_purple);
  },

};

const city_art = {

  stonehaven(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const stone = '#888070', dark_stone = '#5a5248', roof = '#6a5040', sky = '#203048', window_color = '#ffee88';

    for (let grid_x = 0; grid_x <= SPRITE_GRID_MAX_INDEX; grid_x++) {
      for (let grid_y = 0; grid_y <= 9; grid_y++) paint_pixel(grid_x, grid_y, sky);
    }

    for (let grid_x = 4; grid_x <= 13; grid_x++) for (let grid_y = 6; grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, stone);

    paint_pixel(4,5,stone); paint_pixel(5,5,stone); paint_pixel(7,5,stone); paint_pixel(8,5,stone); paint_pixel(10,5,stone); paint_pixel(11,5,stone); paint_pixel(13,5,stone);
    paint_pixel(4,4,dark_stone); paint_pixel(7,4,dark_stone); paint_pixel(10,4,dark_stone); paint_pixel(13,4,dark_stone);

    for (let grid_x = 1; grid_x <= 5; grid_x++) for (let grid_y = 9; grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, dark_stone);
    paint_pixel(1,8,dark_stone); paint_pixel(3,8,dark_stone); paint_pixel(5,8,dark_stone);

    for (let grid_x = 12; grid_x <= 16; grid_x++) for (let grid_y = 9; grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, dark_stone);
    paint_pixel(12,8,dark_stone); paint_pixel(14,8,dark_stone); paint_pixel(16,8,dark_stone);

    paint_pixel(7,9,window_color); paint_pixel(8,9,window_color); paint_pixel(10,9,window_color); paint_pixel(11,9,window_color);
    paint_pixel(7,12,window_color); paint_pixel(8,12,window_color); paint_pixel(10,12,window_color); paint_pixel(11,12,window_color);

    for (let grid_x = 8; grid_x <= 10; grid_x++) for (let grid_y = 14; grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, '#2a1a0a');

    for (let grid_x = 0; grid_x <= SPRITE_GRID_MAX_INDEX; grid_x++) paint_pixel(grid_x, 17, '#3a3028');
  },

  ironhold(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const iron = '#6a7a7a', dark_iron = '#3a4a4a', mountain = '#4a4040', snow = '#ddd8d0', sky = '#101820', torch = '#ff8800';

    for (let grid_y = 0; grid_y <= SPRITE_GRID_MAX_INDEX; grid_y++) {
      for (let grid_x = 0; grid_x <= SPRITE_GRID_MAX_INDEX; grid_x++) paint_pixel(grid_x, grid_y, sky);
    }
    paint_pixel(3,11,mountain); paint_pixel(4,10,mountain); paint_pixel(5,9,mountain); paint_pixel(6,8,mountain); paint_pixel(7,9,mountain); paint_pixel(8,10,mountain);
    paint_pixel(10,8,mountain); paint_pixel(11,7,mountain); paint_pixel(12,8,mountain); paint_pixel(13,9,mountain); paint_pixel(14,10,mountain); paint_pixel(15,11,mountain);
    for (let grid_x = 0;  grid_x <= 5;  grid_x++) for (let grid_y = 11; grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, mountain);
    for (let grid_x = 13; grid_x <= 17; grid_x++) for (let grid_y = 10; grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, mountain);

    paint_pixel(6,8,snow); paint_pixel(11,7,snow); paint_pixel(12,8,snow);

    for (let grid_x = 4; grid_x <= 13; grid_x++) for (let grid_y = 10; grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, iron);

    for (let grid_x = 4; grid_x <= 13; grid_x += 2) paint_pixel(grid_x, 9, dark_iron);

    for (let grid_x = 3;  grid_x <= 5;  grid_x++) for (let grid_y = 7; grid_y <= 11; grid_y++) paint_pixel(grid_x, grid_y, dark_iron);
    for (let grid_x = 12; grid_x <= 14; grid_x++) for (let grid_y = 7; grid_y <= 11; grid_y++) paint_pixel(grid_x, grid_y, dark_iron);

    paint_pixel(4,6,torch); paint_pixel(13,6,torch);

    for (let grid_x = 8; grid_x <= 10; grid_x++) for (let grid_y = 13; grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, '#1a1010');

    paint_pixel(8,13,'#555'); paint_pixel(9,13,'#555'); paint_pixel(10,13,'#555');
  },

  duskwater(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const wood = '#6a4a2a', dark_wood = '#4a2a0a', sail = '#e8dcc0', water = '#1a3a5a', dark_water = '#0a2a4a', sky = '#1a2a4a', mast = '#5a3a1a';

    for (let grid_y = 0;  grid_y <= 8;  grid_y++) for (let grid_x = 0; grid_x <= SPRITE_GRID_MAX_INDEX; grid_x++) paint_pixel(grid_x, grid_y, sky);
    for (let grid_y = 12; grid_y <= 17; grid_y++) for (let grid_x = 0; grid_x <= SPRITE_GRID_MAX_INDEX; grid_x++) paint_pixel(grid_x, grid_y, (grid_y % 2 === 0) ? water : dark_water);

    for (let grid_x = 0;  grid_x <= SPRITE_GRID_MAX_INDEX; grid_x++) for (let grid_y = 11; grid_y <= 13; grid_y++) paint_pixel(grid_x, grid_y, wood);
    for (let grid_x = 0;  grid_x <= 3;  grid_x++) for (let grid_y = 9; grid_y <= 12; grid_y++) paint_pixel(grid_x, grid_y, dark_wood);
    for (let grid_x = 14; grid_x <= 17; grid_x++) for (let grid_y = 9; grid_y <= 12; grid_y++) paint_pixel(grid_x, grid_y, dark_wood);

    for (let grid_x = 4; grid_x <= 8;  grid_x++) for (let grid_y = 6; grid_y <= 11; grid_y++) paint_pixel(grid_x, grid_y, wood);
    for (let grid_x = 9; grid_x <= 13; grid_x++) for (let grid_y = 7; grid_y <= 11; grid_y++) paint_pixel(grid_x, grid_y, dark_wood);

    for (let grid_x = 3; grid_x <= 9; grid_x++) paint_pixel(grid_x, 5, '#8a5a3a');
    paint_pixel(4,4,'#8a5a3a'); paint_pixel(5,4,'#8a5a3a'); paint_pixel(6,3,'#8a5a3a'); paint_pixel(7,4,'#8a5a3a'); paint_pixel(8,4,'#8a5a3a');

    for (let grid_y = 2; grid_y <= 11; grid_y++) paint_pixel(15, grid_y, mast);

    for (let grid_x = 12; grid_x <= 14; grid_x++) for (let grid_y = 3; grid_y <= 8; grid_y++) paint_pixel(grid_x, grid_y, sail);

    for (let grid_x = 1; grid_x <= 16; grid_x += 3) paint_pixel(grid_x, 14, '#4a6a8a');
    for (let grid_x = 2; grid_x <= 15; grid_x += 4) paint_pixel(grid_x, 16, '#4a6a8a');
  },

  ashenveil(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const ash = '#5a4a4a', dark_ash = '#3a2a2a', curse = '#8800aa', fire = '#cc4400', skull = '#ccc8b0', sky = '#0a0808';

    for (let grid_y = 0; grid_y <= SPRITE_GRID_MAX_INDEX; grid_y++) {
      for (let grid_x = 0; grid_x <= SPRITE_GRID_MAX_INDEX; grid_x++) paint_pixel(grid_x, grid_y, sky);
    }

    for (let grid_x = 2;  grid_x <= 7;  grid_x++) for (let grid_y = 8;  grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, ash);
    for (let grid_x = 10; grid_x <= 15; grid_x++) for (let grid_y = 10; grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, ash);

    paint_pixel(2,7,ash); paint_pixel(4,6,ash); paint_pixel(6,5,ash); paint_pixel(7,7,ash);
    paint_pixel(10,9,ash); paint_pixel(12,8,ash); paint_pixel(14,7,ash); paint_pixel(15,9,ash);

    paint_pixel(8,11,curse); paint_pixel(9,11,curse); paint_pixel(8,12,curse); paint_pixel(9,12,curse);
    paint_pixel(8,10,curse); paint_pixel(9,10,curse); paint_pixel(7,12,curse); paint_pixel(10,12,curse);

    paint_pixel(1,6,skull); paint_pixel(1,5,skull); paint_pixel(16,7,skull); paint_pixel(16,6,skull);
    paint_pixel(0,7,'#5a3a2a'); paint_pixel(17,8,'#5a3a2a');

    paint_pixel(3,7,fire); paint_pixel(11,8,fire); paint_pixel(5,9,fire); paint_pixel(14,9,fire);

    for (let grid_x = 0; grid_x <= SPRITE_GRID_MAX_INDEX; grid_x++) paint_pixel(grid_x, 17, dark_ash);
    paint_pixel(4,16,sky); paint_pixel(8,16,sky); paint_pixel(12,16,sky); paint_pixel(5,17,sky); paint_pixel(11,17,sky);
  },

  gilded_reach(canvas) {
    const canvas_ctx = canvas.getContext('2d');
    const paint_pixel = make_pixel_painter(canvas_ctx);
    canvas_ctx.clearRect(0, 0, SPRITE_NATIVE_SIZE, SPRITE_NATIVE_SIZE);
    const gold = '#ccaa00', light_gold = '#eecc44', marble = '#e8e0d0', dark_marble = '#c0b8a8', sky = '#1a2a4a', window_color = '#88ccff';

    for (let grid_y = 0; grid_y <= 7; grid_y++) for (let grid_x = 0; grid_x <= SPRITE_GRID_MAX_INDEX; grid_x++) paint_pixel(grid_x, grid_y, sky);

    for (let grid_x = 2; grid_x <= 15; grid_x++) for (let grid_y = 5; grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, marble);

    for (let grid_y = 7; grid_y <= 16; grid_y++) {
      paint_pixel(3, grid_y, dark_marble); paint_pixel(4, grid_y, dark_marble);
      paint_pixel(8, grid_y, dark_marble); paint_pixel(9, grid_y, dark_marble);
      paint_pixel(13, grid_y, dark_marble); paint_pixel(14, grid_y, dark_marble);
    }

    for (let grid_x = 1; grid_x <= 16; grid_x++) paint_pixel(grid_x, 4, gold);
    paint_pixel(1,3,gold); paint_pixel(16,3,gold);
    paint_pixel(2,3,light_gold); paint_pixel(15,3,light_gold);
    for (let grid_x = 3; grid_x <= 14; grid_x++) paint_pixel(grid_x, 3, marble);
    paint_pixel(5,2,light_gold); paint_pixel(12,2,light_gold); paint_pixel(8,1,light_gold); paint_pixel(9,1,light_gold);

    paint_pixel(5,9,window_color); paint_pixel(6,9,window_color); paint_pixel(11,9,window_color); paint_pixel(12,9,window_color);
    paint_pixel(5,12,window_color); paint_pixel(6,12,window_color); paint_pixel(11,12,window_color); paint_pixel(12,12,window_color);

    paint_pixel(8,0,light_gold); paint_pixel(9,0,light_gold);

    for (let grid_x = 7; grid_x <= 10; grid_x++) for (let grid_y = 14; grid_y <= 17; grid_y++) paint_pixel(grid_x, grid_y, dark_marble);
    for (let grid_x = 7; grid_x <= 10; grid_x++) paint_pixel(grid_x, 13, gold);

    paint_pixel(1,17,gold); paint_pixel(5,17,light_gold); paint_pixel(12,17,gold); paint_pixel(16,17,light_gold);
  },

};

function paint_sprite(canvas, painter) {
  if (!painter) {
    const fallback_ctx    = canvas.getContext('2d');
    const fallback_width  = canvas.width;
    const fallback_height = canvas.height;
    fallback_ctx.clearRect(0, 0, fallback_width, fallback_height);
    fallback_ctx.fillStyle    = '#ff0000';
    fallback_ctx.font         = `${Math.floor(fallback_width * FALLBACK_FONT_SCALE)}px sans-serif`;
    fallback_ctx.textAlign    = 'center';
    fallback_ctx.textBaseline = 'middle';
    fallback_ctx.fillText('?', fallback_width / 2, fallback_height / 2);
    return;
  }
  painter(canvas);
}

function paint_sprite_scaled(canvas, painter, target_width, target_height, native_size = SPRITE_NATIVE_SIZE) {
  const offscreen_canvas  = document.createElement('canvas');
  offscreen_canvas.width  = native_size;
  offscreen_canvas.height = native_size;
  paint_sprite(offscreen_canvas, painter);
  canvas.width  = target_width;
  canvas.height = target_height;
  const draw_ctx = canvas.getContext('2d');
  draw_ctx.clearRect(0, 0, target_width, target_height);
  draw_ctx.imageSmoothingEnabled = false;
  draw_ctx.drawImage(offscreen_canvas, 0, 0, target_width, target_height);
}
