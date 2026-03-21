/* ==========================================
   ASSETS.JS — Images & pixel sprite renderer
   ========================================== */

// ── Remote Images ──────────────────────────
const psychoImg = new Image();
psychoImg.crossOrigin = 'Anonymous';
psychoImg.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0jmOuP1w9oPhZVvYaikSq1Oq0MvFau_zo2w&s';

const goliathImg = new Image();
goliathImg.crossOrigin = 'Anonymous';
goliathImg.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbg5PEzhkPqMPe7qS1nMy85G1goBWVvh5qSQ&s';

const clapImg = new Image();
clapImg.crossOrigin = 'Anonymous';
clapImg.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgaWqUin2QIxnCnrv7aA0zpJr2RKlFlFR82w&s';

const catchARideImg = new Image();
catchARideImg.crossOrigin = 'Anonymous';
catchARideImg.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQev02_MqVA_cgUk1wkRKnKEHdNxb5cVlX8VQ&s';

// ── Base64 Images (paste your own here) ────
const moxxiImg      = new Image();
const lilithImg     = new Image();
const sancBgImg     = new Image();
const zedImg        = new Image();
const bankImg       = new Image();
const slotsImg      = new Image();
const bountyImg     = new Image();
const mayhemImg     = new Image();
const quickChangeImg= new Image();
const badassImg     = new Image();

// NOTE: Paste your base64 strings here:
// moxxiImg.src   = "data:image/jpeg;base64,...";
// lilithImg.src  = "data:image/jpeg;base64,...";
// sancBgImg.src  = "data:image/jpeg;base64,...";
// zedImg.src     = "data:image/jpeg;base64,...";
// bankImg.src    = "data:image/jpeg;base64,...";
// slotsImg.src   = "data:image/jpeg;base64,...";
// bountyImg.src  = "data:image/jpeg;base64,...";
// mayhemImg.src  = "data:image/jpeg;base64,...";
// quickChangeImg.src = "data:image/jpeg;base64,...";
// badassImg.src  = "data:image/png;base64,...";

// ── Pixel Sprite Renderer ──────────────────
function drawPixelSprite(context, name, x, y, s) {
  context.save();
  context.translate(x, y);

  switch(name) {
    case 'zero':
      context.fillStyle = '#222'; context.beginPath(); context.arc(0, 0, s/2, 0, Math.PI*2); context.fill();
      context.strokeStyle = '#0ff'; context.lineWidth = 2; context.stroke();
      context.fillStyle = '#0ff'; context.fillRect(-s/4, -s/8, s/2, s/4);
      context.fillStyle = '#111'; context.font = 'bold ' + (s/2.5) + 'px Courier'; context.textAlign = 'center';
      context.fillText('0', 0, s/8);
      break;
    case 'maya':
      context.fillStyle = '#ffcc00'; context.fillRect(-s/2, -s/8, s, s/2);
      context.fillStyle = '#222';    context.fillRect(-s/4, -s/8, s/2, s/2);
      context.fillStyle = '#ffe0bd'; context.beginPath(); context.arc(0, -s/4, s/2.5, 0, Math.PI*2); context.fill();
      context.fillStyle = '#0055ff'; context.beginPath(); context.arc(0, -s/2, s/2.5, 0, Math.PI); context.fill();
      context.fillStyle = '#0ff';    context.fillRect(-s/4, -s/4, 4, 6);
      break;
    case 'axton':
      context.fillStyle = '#556b2f'; context.fillRect(-s/2, -s/8, s, s/2);
      context.fillStyle = '#222';    context.fillRect(-s/4, -s/8, s/2, s/2);
      context.fillStyle = '#ffe0bd'; context.beginPath(); context.arc(0, -s/4, s/2.5, 0, Math.PI*2); context.fill();
      context.fillStyle = '#333';    context.fillRect(-s/2.5, -s/2, s*0.8, s/4);
      context.fillStyle = '#0f0';    context.fillRect(-s/4, -s/4, 4, 4);
      break;
    case 'salvador':
      context.fillStyle = '#8b4513'; context.fillRect(-s*0.6, -s/8, s*1.2, s*0.4);
      context.fillStyle = '#ffe0bd'; context.beginPath(); context.arc(0, -s/5, s/2.8, 0, Math.PI*2); context.fill();
      context.fillStyle = '#222';    context.fillRect(-s/3, -s/2, s/1.5, s/5);
      context.fillStyle = '#555';    context.fillRect(-s*0.8, 0, s/3, 4); context.fillRect(s*0.5, 0, s/3, 4);
      break;
    case 'krieg':
      context.fillStyle = '#ffaa00'; context.fillRect(-s/2, -s/8, s, s/2);
      context.fillStyle = '#ffe0bd'; context.beginPath(); context.arc(0, -s/4, s/2.5, 0, Math.PI*2); context.fill();
      context.fillStyle = '#fff';    context.fillRect(-s/4, -s/2, s/2, s/3);
      context.fillStyle = '#f00';    context.beginPath(); context.arc(0, -s/3, 3, 0, Math.PI*2); context.fill();
      break;
    case 'gaige':
      context.fillStyle = '#cc0000'; context.fillRect(-s/2, -s/8, s, s/2);
      context.fillStyle = '#ffe0bd'; context.beginPath(); context.arc(0, -s/4, s/2.5, 0, Math.PI*2); context.fill();
      context.fillStyle = '#ff8800'; context.beginPath(); context.arc(0, -s/2, s/2.5, 0, Math.PI); context.fill();
      context.fillStyle = '#888';    context.fillRect(s/4, -s/8, s/4, s/2);
      break;
    case 'turret':
      context.fillStyle = '#556b2f';
      context.beginPath(); context.moveTo(-s/2, s/2); context.lineTo(0, -s/4); context.lineTo(s/2, s/2); context.fill();
      context.fillStyle = '#333'; context.fillRect(-s/4, -s/2, s/2, s/2);
      break;
    case 'deathtrap':
      context.fillStyle = '#888';
      context.beginPath(); context.moveTo(-s/2, s/2); context.lineTo(0, -s/4); context.lineTo(s/2, s/2); context.fill();
      context.fillStyle = '#0ff'; context.fillRect(-s/4, -s/2, s/2, s/2);
      context.fillStyle = '#f00'; context.fillRect(-2, -s/2.5, 4, 4);
      break;
    case 'psycho':
      context.fillStyle = '#f00'; context.beginPath(); context.arc(0, 0, s/2, 0, Math.PI*2); context.fill();
      context.fillStyle = '#fff'; context.fillRect(-s/4, -s/8, s/2, s/4);
      context.fillStyle = '#000'; context.fillRect(-s/8, -s/8, 4, 4);
      break;
    case 'goliath':
      context.fillStyle = '#8800ff'; context.fillRect(-s/2, -s/2, s, s);
      context.fillStyle = '#0f0';   context.beginPath(); context.arc(0, -s/4, s/4, 0, Math.PI*2); context.fill();
      break;
    case 'loader':
      context.fillStyle = '#ccaa00'; context.fillRect(-s/2, -s/2, s, s*0.8);
      context.fillStyle = '#555';    context.fillRect(-s/2, s*0.3, s/4, s/2); context.fillRect(s/4, s*0.3, s/4, s/2);
      context.fillStyle = '#ffcc00'; context.fillRect(-s/2.5, -s/2.5, s/1.5, s/1.5);
      context.fillStyle = '#f00';    context.beginPath(); context.arc(0, -s/8, s/8, 0, Math.PI*2); context.fill();
      break;
    case 'boss':
      context.fillStyle = '#800080'; context.beginPath(); context.arc(0, 0, s/2, 0, Math.PI*2); context.fill();
      context.strokeStyle = '#f00'; context.lineWidth = 4; context.stroke();
      context.fillStyle = '#fff'; context.fillRect(-s/3, -s/8, s/1.5, s/4);
      break;
    case 'terramorphous':
    case 'crawmerax':
    case 'pete': {
      let baseCol = name === 'terramorphous' ? '#8b4513' : (name === 'crawmerax' ? '#800080' : '#ff4500');
      let eyeCol  = name === 'terramorphous' ? '#0f0'    : (name === 'crawmerax' ? '#0ff'    : '#fff');
      context.fillStyle = baseCol; context.beginPath(); context.arc(0, 0, s/2, 0, Math.PI*2); context.fill();
      context.fillStyle = eyeCol;  context.beginPath(); context.arc(0, 0, s/4, 0, Math.PI*2); context.fill();
      context.fillStyle = baseCol;
      for(let i = 0; i < 8; i++) { let a = (Math.PI*2/8)*i; context.fillRect(Math.cos(a)*s/2, Math.sin(a)*s/2, 15, 15); }
      break;
    }
    case 'vehicle':
      context.fillStyle = '#ff6600'; context.fillRect(-s*0.8, -s/2, s*1.6, s);
      context.fillStyle = '#0ff';    context.fillRect(-s*0.4, -s*0.4, s*0.8, s*0.8);
      context.fillStyle = '#111';
      context.fillRect(-s*0.6, -s*0.7, s*0.4, s*0.2); context.fillRect(s*0.2, -s*0.7, s*0.4, s*0.2);
      context.fillRect(-s*0.6,  s*0.5, s*0.4, s*0.2); context.fillRect(s*0.2,  s*0.5, s*0.4, s*0.2);
      break;
  }

  context.restore();
}