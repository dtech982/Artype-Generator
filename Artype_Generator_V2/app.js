// Artyping V2 — app.js
// Extended with user-requested features:
// - Zoom bar moved above preview
// - Draggable toolbar resizer
// - Gradient flipped (left = white / light; right = black / dark)
// - Image Size slider (controls columns) in place of rowSpacing
// - Dynamic mapping levels (add/remove) and live preview
// - Re-introduced invert toggle
// - Replace empty space placeholder
// - Custom-cell edits with "custom edits will be lost" warning & confirm on regenerate

const fileInput = document.getElementById('fileInput');
const dropArea = document.getElementById('dropArea');
const previewCanvas = document.getElementById('previewCanvas');
const ctx = previewCanvas.getContext('2d');
const rotation = document.getElementById('rotation');
const rotationVal = document.getElementById('rotVal');
const brightness = document.getElementById('brightness');
const brightnessVal = document.getElementById('brightVal');
const contrast = document.getElementById('contrast');
const contrastVal = document.getElementById('contrastVal');
const cellWInput = document.getElementById('cellW');
const cellHInput = document.getElementById('cellH');
const alphaThresh = document.getElementById('alphaThresh');
const generateBtn = document.getElementById('generateBtn');
const exportText = document.getElementById('exportText');
const exportPNG = document.getElementById('exportPNG');
const zoom = document.getElementById('zoom');
const mappingTable = document.getElementById('mappingTable');
const gradientPreview = document.getElementById('gradientPreview');
const imageSize = document.getElementById('imageSize'); // slider controlling columns
const resetBtn = document.getElementById('resetBtn');
const columnsInput = document.getElementById('columns');
const sizeLetters = document.getElementById('sizeLetters');
const physicalSize = document.getElementById('physicalSize');
const spacingPreset = document.getElementById('spacingPreset');
const cpiInput = document.getElementById('cpi');
const paperWidth = document.getElementById('paperWidth');
const leftMargin = document.getElementById('leftMargin');
const printableCols = document.getElementById('printableCols');
const startColumn = document.getElementById('startColumn');
const previewWindow = document.getElementById('previewWindow');
const addLevelBtn = document.getElementById('addLevel');
const removeLevelBtn = document.getElementById('removeLevel');
const levelCountSpan = document.getElementById('levelCount');
const invertToggle = document.getElementById('invert');
const fillSpacesToggle = document.getElementById('fillSpacesToggle');
const fillSpacesChar = document.getElementById('fillSpacesChar');
const resizer = document.getElementById('resizer');

let img = new Image();
let imgLoaded = false;
let workingImageCanvas = document.createElement('canvas');
let workingCtx = workingImageCanvas.getContext('2d');

// mapping is dynamic length
let baseMapping = [' ', '.', ':', 'I', 'V', 'Z', 'N', 'M'];
let mapping = baseMapping.slice(); // index 0 = lightest
let levels = mapping.length;

let gridChars = []; // 2D array of characters
let gridW = 0, gridH = 0;

// track custom cell edits presence — if true, warn before regenerating
let hasCustomCells = false;

// Keep a simple lock to avoid repeated prompt spam
let awaitingCustomEditConfirm = false;

// build mapping table UI (uses current 'levels' and 'mapping' array)
function buildMappingTable(){
  mappingTable.innerHTML = '';
  const tbody = document.createElement('tbody');
  for(let i=0;i<levels;i++){
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.textContent = i; // level index (0 lightest)
    const td2 = document.createElement('td');
    const inp = document.createElement('input');
    inp.value = mapping[i] || '';
    inp.addEventListener('change',()=>{
      mapping[i]=inp.value || ' ';
      drawGradientPreview();
      // regenerate preview immediately, but honor custom-cell confirmation
      computeAndRenderSafe();
    });
    td2.appendChild(inp);
    tr.appendChild(td1); tr.appendChild(td2);
    tbody.appendChild(tr);
  }
  mappingTable.appendChild(tbody);
  levelCountSpan.textContent = String(levels);
}
buildMappingTable();

// add/remove level handlers
addLevelBtn.addEventListener('click', ()=>{
  mapping.push(' ');
  levels = mapping.length;
  buildMappingTable();
  drawGradientPreview();
  computeAndRenderSafe();
});
removeLevelBtn.addEventListener('click', ()=>{
  if(levels <= 2) return;
  mapping.pop();
  levels = mapping.length;
  buildMappingTable();
  drawGradientPreview();
  computeAndRenderSafe();
});

// drag & drop
['dragenter','dragover','dragleave','drop'].forEach(evt=>{
  dropArea.addEventListener(evt,(e)=>{e.preventDefault();e.stopPropagation();});
});
dropArea.addEventListener('drop',(e)=>{
  const d = e.dataTransfer.files && e.dataTransfer.files[0];
  if(d) loadFile(d);
});
fileInput.addEventListener('change',(e)=>{ const f=e.target.files[0]; if(f) loadFile(f); });

function loadFile(file){
  const reader = new FileReader();
  reader.onload = ()=>{ img.onload = ()=>{ imgLoaded=true; fitCanvasToImage(); drawGradientPreview(); computeAndRenderSafe(); }; img.src = reader.result; };
  reader.readAsDataURL(file);
}

function fitCanvasToImage(){
  workingImageCanvas.width = img.naturalWidth;
  workingImageCanvas.height = img.naturalHeight;
}

// UI event bindings — any of these cause re-rendering, so we use computeAndRenderSafe() to guard custom edits
rotation.addEventListener('input',()=>{rotationVal.textContent=rotation.value; computeAndRenderSafe();});
brightness.addEventListener('input',()=>{brightnessVal.textContent=brightness.value; computeAndRenderSafe();});
contrast.addEventListener('input',()=>{contrastVal.textContent=contrast.value; computeAndRenderSafe();});
cellWInput.addEventListener('input',()=>computeAndRenderSafe());
cellHInput.addEventListener('input',()=>computeAndRenderSafe());
alphaThresh.addEventListener('change',()=>computeAndRenderSafe());
columnsInput.addEventListener('input',()=>{
  // keep slider in sync
  const val = parseInt(columnsInput.value,10) || 1;
  imageSize.value = Math.max(10, Math.min(200, val));
  computeAndRenderSafe();
});
imageSize.addEventListener('input',()=>{
  // imageSize controls columns; keep numeric input in sync
  const val = Math.round(parseFloat(imageSize.value));
  columnsInput.value = val;
  computeAndRenderSafe();
});

spacingPreset.addEventListener('change',()=>{
  if(spacingPreset.value==='pica'){ cpiInput.value=10; }
  else if(spacingPreset.value==='elite'){ cpiInput.value=12; }
  computeAndRenderSafe();
});
cpiInput.addEventListener('input',()=>computeAndRenderSafe());
paperWidth.addEventListener('input',()=>computeAndRenderSafe());
leftMargin.addEventListener('input',()=>computeAndRenderSafe());

invertToggle.addEventListener('change', ()=>{
  // toggle invert: reverse mapping direction virtually by switching a flag used in posterize
  computeAndRenderSafe();
});

zoom.addEventListener('input',()=>{
  const z = parseFloat(zoom.value) || 1;
  previewCanvas.style.transform = `scale(${z})`;
});

// resizer behaviour: drag up/down to change toolbar height
(function setupResizer(){
  let dragging = false;
  let startY = 0, startHeight = 0;
  const toolbar = document.getElementById('toolbarTop');
  resizer.addEventListener('mousedown', (e)=>{
    dragging = true; startY = e.clientY; startHeight = toolbar.offsetHeight;
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('mousemove', (e)=>{
    if(!dragging) return;
    const dy = e.clientY - startY;
    const newH = Math.max(40, startHeight + dy);
    toolbar.style.height = newH + 'px';
  });
  window.addEventListener('mouseup', ()=>{
    if(dragging){ dragging = false; document.body.style.userSelect = ''; }
  });
})();

// image processing helpers
function applyBrightnessContrast(data, brightnessVal, contrastVal){
  const b = brightnessVal/100 * 255;
  const contrast = contrastVal * 2.55;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for(let i=0;i<data.length;i+=4){
    for(let j=0;j<3;j++){
      let v = data[i+j];
      v = factor * (v - 128) + 128 + b;
      data[i+j] = Math.max(0,Math.min(255,Math.round(v)));
    }
  }
}

function desaturateToGray(data){
  for(let i=0;i<data.length;i+=4){
    const r=data[i], g=data[i+1], b=data[i+2];
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    data[i]=data[i+1]=data[i+2]=lum;
  }
}

// posterize: map brightness (0=black ... 255=white) to level 0..levels-1 where 0 is LIGHTEST
// invert toggle flips mapping direction if set
function posterizeToLevels(val, levelsCount=8){
  // Optionally invert mapping using invertToggle
  let v = val;
  if(invertToggle.checked){
    // invert brightness mapping: white->dark, black->light
    v = 255 - v;
  }
  // We want v (0..255) where 0=black -> map black to highest index (dark) and white to lowest index (light).
  // To keep left-to-right gradient = white->black, posterize uses inverted-level calculation below.
  const inverted = 255 - v; // now white->0, black->255
  const step = 256/levelsCount;
  const level = Math.floor(inverted / step);
  return Math.max(0, Math.min(levelsCount-1, level));
}

// drawGradientPreview: FLIPPED so left=white (light) and right=black (dark)
function drawGradientPreview(){
  if(!gradientPreview) return;
  const gctx = gradientPreview.getContext('2d');
  const w = gradientPreview.width = gradientPreview.clientWidth;
  const h = gradientPreview.height = gradientPreview.clientHeight;
  gctx.clearRect(0,0,w,h);
  const steps = 256;
  for(let i=0;i<steps;i++){
    const x = Math.floor((i/steps)*w);
    // Flip: left should be white -> high gray value; right black -> low gray value
    const gray = Math.round(((steps - 1 - i) / (steps-1)) * 255);
    gctx.fillStyle = `rgb(${gray},${gray},${gray})`;
    gctx.fillRect(x,0,Math.ceil(w/steps)+1,h);
  }
  gctx.font = `${Math.max(10, Math.floor(h*0.75))}px Courier, monospace`;
  gctx.textAlign = 'center'; gctx.textBaseline = 'middle';
  for(let i=0;i<levels;i++){
    const pos = ((i + 0.5)/levels) * w;
    const ch = mapping[i] || ' ';
    // Determine underlying gray for that position (left white => lighter)
    const grayVal = Math.round(((levels - 1 - i + 0.5)/levels)*255);
    const textColor = (grayVal < 140) ? '#ffffff' : '#000000';
    gctx.fillStyle = textColor;
    gctx.fillText(ch, pos, h/2 + 1);
  }
}

// compute grid sizes from columns while preserving image proportion and character aspect
function computeGridSizeFromColumns(columns, cellW, cellH, imgW, imgH){
  const scaledWidthPx = columns * cellW;
  const scaledHeightPx = (imgH * scaledWidthPx) / imgW;
  const rows = Math.max(1, Math.round(scaledHeightPx / cellH));
  return {columns: Math.max(1, Math.floor(columns)), rows};
}

// SAFE wrapper: if there are custom edits, confirm before proceeding
function computeAndRenderSafe(){
  if(hasCustomCells && !awaitingCustomEditConfirm){
    awaitingCustomEditConfirm = true;
    const ok = confirm('You have custom cell edits. Changing image or controls will RESET those custom cell edits. Continue?');
    awaitingCustomEditConfirm = false;
    if(!ok) return; // abort
    // user confirmed; clear custom edits marker
    hasCustomCells = false;
  }
  computeAndRender();
}

// main compute + render (keeps underlying canvas content unchanged by zoom)
function computeAndRender(){
  if(!imgLoaded) return;
  // draw transformed image into working canvas with rotation
  const angle = parseFloat(rotation.value) * Math.PI/180;
  const w = img.naturalWidth; const h = img.naturalHeight;
  const absSin = Math.abs(Math.sin(angle)), absCos = Math.abs(Math.cos(angle));
  const bw = Math.ceil(w*absCos + h*absSin);
  const bh = Math.ceil(w*absSin + h*absCos);
  workingImageCanvas.width = bw; workingImageCanvas.height = bh;
  workingCtx.save();
  workingCtx.clearRect(0,0,bw,bh);
  workingCtx.translate(bw/2, bh/2);
  workingCtx.rotate(angle);
  workingCtx.drawImage(img, -w/2, -h/2);
  workingCtx.restore();

  const imData = workingCtx.getImageData(0,0,bw,bh);
  const data = imData.data;

  // alpha threshold
  if(alphaThresh.checked){
    for(let i=0;i<data.length;i+=4){
      if(data[i+3] < 128){ data[i]=data[i+1]=data[i+2]=255; data[i+3]=255; }
    }
  }

  desaturateToGray(data);
  applyBrightnessContrast(data, parseInt(brightness.value,10), parseInt(contrast.value,10));

  // compute grid based on columns input but preserve character cell aspect
  const cellW = Math.max(1,parseInt(cellWInput.value,10) || 8);
  const cellH = Math.max(1,parseInt(cellHInput.value,10) || 10);

  // columns may be controlled by imageSize slider or numeric—use numeric (kept in sync)
  const colCount = Math.max(1, parseInt(columnsInput.value,10) || 60);
  const grid = computeGridSizeFromColumns(colCount, cellW, cellH, bw, bh);
  gridW = grid.columns;
  gridH = grid.rows;

  // save letter size info for UI
  sizeLetters.textContent = `${gridW} × ${gridH}`;

  // compute physical size using CPI and line spacing (approx)
  const cpi = Math.max(1, parseFloat(cpiInput.value) || 10);
  const inchesWide = (gridW / cpi).toFixed(2);
  const lpiDefault = 6; // lines per inch approximate
  const inchesHigh = (gridH / (lpiDefault)).toFixed(2);
  physicalSize.textContent = `${inchesWide} in × ${inchesHigh} in`;

  // printable columns & suggested starting column to center
  const paperW = Math.max(1, parseFloat(paperWidth.value) || 8.5);
  const leftMarginIn = Math.max(0, parseFloat(leftMargin.value) || 0.75);
  const colsPrintable = Math.floor((paperW - leftMarginIn) * cpi);
  printableCols.textContent = `${colsPrintable}`;
  const startCol = Math.max(0, Math.floor((colsPrintable - gridW) / 2));
  startColumn.textContent = `${startCol}`;

  // build gridChars by sampling working canvas
  gridChars = new Array(gridH);
  for(let gy=0; gy<gridH; gy++){
    gridChars[gy] = new Array(gridW).fill(' ');
    for(let gx=0; gx<gridW; gx++){
      let sum=0, count=0;
      // scaled mapping from grid to working canvas
      const scaledWidthPx = gridW * cellW;
      const scaledHeightPx = gridH * cellH;
      const sx = Math.floor((gx * cellW) * (bw / scaledWidthPx));
      const sy = Math.floor((gy * cellH) * (bh / scaledHeightPx));
      const ex = Math.min(bw, Math.floor(((gx+1) * cellW) * (bw / scaledWidthPx)));
      const ey = Math.min(bh, Math.floor(((gy+1) * cellH) * (bh / scaledHeightPx)));
      for(let y=sy; y<ey; y++){
        for(let x=sx; x<ex; x++){
          const idx = (y * bw + x) * 4;
          sum += data[idx];
          count++;
        }
      }
      const avg = (count>0) ? (sum / count) : 255;
      const lvl = posterizeToLevels(avg, levels);
      gridChars[gy][gx] = mapping[lvl] || ' ';
    }
  }

  // render onto previewCanvas (without zoom scaling)
  const renderRowH = Math.max(1, Math.round(cellH)); // image size slider controls density; vertical spacing uses cellH
  const outW = gridW * cellW;
  const outH = gridH * renderRowH;
  previewCanvas.width = outW;
  previewCanvas.height = outH;
  // white background
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,outW,outH);

  ctx.fillStyle = '#000000';
  const fontSize = Math.floor(renderRowH);
  ctx.font = Math.max(6, fontSize) + 'px Courier, monospace';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';

  // if fillSpacesToggle is on, use fill char for ' '
  const fillSpaces = fillSpacesToggle.checked;
  const fillChar = (fillSpacesChar.value && fillSpacesChar.value.length) ? fillSpacesChar.value[0] : ' ';

  for(let gy=0; gy<gridH; gy++){
    for(let gx=0; gx<gridW; gx++){
      let ch = gridChars[gy][gx];
      if(ch === ' ' && fillSpaces) ch = fillChar;
      const cx = (gx * cellW) + (cellW / 2);
      const cy = (gy * renderRowH) + (renderRowH / 2);
      ctx.fillText(ch, cx, cy + 0.5);
    }
  }

  // re-draw gradient and mapping table
  buildMappingTable();
  drawGradientPreview();

  // ensure zoom transform applied
  const z = parseFloat(zoom.value) || 1;
  previewCanvas.style.transform = `scale(${z})`;
}

// click handling (cycle)
previewCanvas.addEventListener('click',(e)=>{
  if(!gridChars.length) return;
  const rect = previewCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / (parseFloat(zoom.value)||1);
  const y = (e.clientY - rect.top) / (parseFloat(zoom.value)||1);
  const cellW = Math.max(1,parseInt(cellWInput.value,10)||8);
  const cellH = Math.max(1,parseInt(cellHInput.value,10)||10);
  const renderRowH = Math.max(1, Math.round(cellH));
  const gx = Math.floor(x / cellW);
  const gy = Math.floor(y / renderRowH);
  if(gx<0||gx>=gridW||gy<0||gy>=gridH) return;
  const cur = gridChars[gy][gx];
  let idx = mapping.indexOf(cur);
  if(idx<0) idx = 0;
  idx = (idx + 1) % mapping.length;
  gridChars[gy][gx] = mapping[idx];
  // re-render only the single cell for snappiness
  const cx = (gx * cellW) + (cellW / 2);
  const cy = (gy * renderRowH) + (renderRowH / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(gx*cellW, gy*renderRowH, cellW, renderRowH);
  ctx.fillStyle = '#000000';
  ctx.fillText(gridChars[gy][gx], cx, cy + 0.5);
  // note: cycling a cell is NOT considered a custom edit that causes the "warning" — only right-click custom sets trigger that
});

// custom set on right-click and warn user about further edits
previewCanvas.addEventListener('contextmenu',(e)=>{
  e.preventDefault();
  if(!gridChars.length) return;
  const rect = previewCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / (parseFloat(zoom.value)||1);
  const y = (e.clientY - rect.top) / (parseFloat(zoom.value)||1);
  const cellW = Math.max(1,parseInt(cellWInput.value,10)||8);
  const cellH = Math.max(1,parseInt(cellHInput.value,10)||10);
  const renderRowH = Math.max(1, Math.round(cellH));
  const gx = Math.floor(x / cellW);
  const gy = Math.floor(y / renderRowH);
  if(gx<0||gx>=gridW||gy<0||gy>=gridH) return;
  const custom = prompt('Enter custom character(s) for this cell (string allowed):', gridChars[gy][gx]);
  if(custom===null) return;
  gridChars[gy][gx] = custom || ' ';
  hasCustomCells = true;
  // alert warning that further edits will reset custom cells
  alert('Note: Further image edits (rotation, brightness, contrast, size, etc.) will reset custom cell edits. You will be prompted before those changes.');
  computeAndRender(); // re-render immediate (no reset)
});

// Export text (applies fillSpaces if enabled)
exportText.addEventListener('click',()=>{
  if(!gridChars.length) return alert('Generate first');
  const fillSpaces = fillSpacesToggle.checked;
  const fillChar = (fillSpacesChar.value && fillSpacesChar.value.length) ? fillSpacesChar.value[0] : ' ';
  const lines = gridChars.map(row => row.map(ch => (ch === ' ' && fillSpaces) ? fillChar : ch).join(''));
  const blob = new Blob([lines.join('\n')],{type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='artyping_template.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// Export PNG (applies fillSpaces similarly)
exportPNG.addEventListener('click',()=>{
  if(!gridChars.length) return alert('Generate first');
  const cellW = Math.max(1,parseInt(cellWInput.value,10)||8);
  const cellH = Math.max(1,parseInt(cellHInput.value,10)||10);
  const renderRowH = Math.max(1, Math.round(cellH));
  const outW = gridW * cellW;
  const outH = gridH * renderRowH;
  const tmp = document.createElement('canvas'); tmp.width=outW; tmp.height=outH;
  const tctx = tmp.getContext('2d');
  tctx.fillStyle='#ffffff'; tctx.fillRect(0,0,outW,outH);
  const fontSize = Math.floor(renderRowH);
  tctx.font = Math.max(6, fontSize) + 'px Courier, monospace';
  tctx.textBaseline='middle'; tctx.textAlign='center'; tctx.fillStyle='#000000';
  const fillSpaces = fillSpacesToggle.checked;
  const fillChar = (fillSpacesChar.value && fillSpacesChar.value.length) ? fillSpacesChar.value[0] : ' ';
  for(let gy=0;gy<gridH;gy++){
    for(let gx=0;gx<gridW;gx++){
      const raw = gridChars[gy][gx];
      const ch = (raw === ' ' && fillSpaces) ? fillChar : raw;
      const cx = gx*cellW + cellW/2;
      const cy = gy*renderRowH + renderRowH/2;
      tctx.fillText(ch, cx, cy + 0.5);
    }
  }
  tmp.toBlob((blob)=>{ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='artyping_template.png'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });
});

// generate button
generateBtn.addEventListener('click', ()=>{ if(!imgLoaded) return alert('Load an image first'); computeAndRenderSafe(); });

// Reset defaults
function resetToDefaults(){
  rotation.value = 0; rotationVal.textContent = 0;
  brightness.value = 0; brightnessVal.textContent = 0;
  contrast.value = 0; contrastVal.textContent = 0;
  cellWInput.value = 8; cellHInput.value = 10;
  imageSize.value = 60; columnsInput.value = 60;
  zoom.value = 1; previewCanvas.style.transform = `scale(1)`;
  alphaThresh.checked = false;
  mapping = baseMapping.slice(); levels = mapping.length;
  buildMappingTable();
  drawGradientPreview();
  spacingPreset.value = 'pica';
  cpiInput.value = 10;
  paperWidth.value = 8.5;
  leftMargin.value = 0.75;
  invertToggle.checked = false;
  fillSpacesToggle.checked = false;
  fillSpacesChar.value = '·';
  hasCustomCells = false;
  computeAndRenderSafe();
}

// Small demo image if none loaded
(function loadDemo(){
  const demoUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="100%" height="100%" fill="#ffffff"/><text x="50%" y="50%" font-size="64" text-anchor="middle" dominant-baseline="middle" fill="#111">ARTYPE</text></svg>');
  img.onload = ()=>{ imgLoaded=true; fitCanvasToImage(); drawGradientPreview(); computeAndRenderSafe(); };
  img.src = demoUrl;
})();

// initial gradient draw
drawGradientPreview();

// === Resizable Panels ===
function initResizablePanels() {
    const left = document.getElementById('leftPanel');
    const right = document.getElementById('rightPanel');
    const leftHandle = document.getElementById('leftResizer');
    const rightHandle = document.getElementById('rightResizer');
  
    const startResize = (e, side) => {
      e.preventDefault();
      document.onmousemove = ev => {
        if (side === 'left') {
          const newWidth = ev.clientX - left.getBoundingClientRect().left;
          left.style.width = `${newWidth}px`;
        } else if (side === 'right') {
          const total = document.body.clientWidth;
          const newWidth = total - ev.clientX - 20;
          right.style.width = `${newWidth}px`;
        }
      };
      document.onmouseup = () => {
        document.onmousemove = null;
      };
    };
  
    leftHandle.addEventListener('mousedown', e => startResize(e, 'left'));
    rightHandle.addEventListener('mousedown', e => startResize(e, 'right'));
  }
  initResizablePanels();
  
  
  // === Custom Letter Editing ===
  previewCanvas = document.getElementById('previewCanvas');
  previewCanvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const input = prompt("Enter a custom letter or word:");
    if (!input) return;
    const words = input.split(' ');
    // Example: logic to place letters or words
    // (replace this with your grid update logic)
    console.log("Custom text inserted:", words);
  });
  
  // === Restrict popup trigger ===
  function handleCriticalChange(setting) {
    if (['rotation', 'imageSize'].includes(setting)) {
      alert("Changing this will reset custom letters.");
    }
  }
  
