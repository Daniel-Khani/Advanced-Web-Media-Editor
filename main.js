// Elements
const mediaInput = document.getElementById('media-input');
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('canvas-wrapper');
const cropBox = document.getElementById('crop-box');

// Sliders
const brightness = document.getElementById('brightness');
const contrast = document.getElementById('contrast');
const saturate = document.getElementById('saturate');
const grayscale = document.getElementById('grayscale');
const sepia = document.getElementById('sepia');
const blur = document.getElementById('blur');

// Transform Controls
const rotateLeftBtn = document.getElementById('rotate-left-btn');
const rotateRightBtn = document.getElementById('rotate-right-btn');
const flipHBtn = document.getElementById('flip-h-btn');
const flipVBtn = document.getElementById('flip-v-btn');
const cropToggleBtn = document.getElementById('crop-toggle-btn');
const applyCropBtn = document.getElementById('apply-crop-btn');

// Text Overlay Controls
const textInput = document.getElementById('text-input');
const textColor = document.getElementById('text-color');
const textSize = document.getElementById('text-size');
const addTextBtn = document.getElementById('add-text-btn');

// Actions & Video Controls
const resetBtn = document.getElementById('reset-btn');
const downloadBtn = document.getElementById('download-btn');
const videoControls = document.getElementById('video-controls');
const playPauseBtn = document.getElementById('play-pause-btn');
const videoTime = document.getElementById('video-time');

// State Variables
let mediaType = null; // 'image' or 'video'
let loadedImage = null;
let loadedVideo = null;
let animationFrameId = null;

let rotation = 0;
let flipH = 1;
let flipV = 1;

let textLayers = [];

// 1. File Upload Handler
mediaInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  resetState();
  const fileURL = URL.createObjectURL(file);

  if (file.type.startsWith('image/')) {
    mediaType = 'image';
    videoControls.classList.add('hidden');
    const img = new Image();
    img.onload = () => {
      loadedImage = img;
      canvas.width = img.width;
      canvas.height = img.height;
      render();
    };
    img.src = fileURL;
  } else if (file.type.startsWith('video/')) {
    mediaType = 'video';
    videoControls.classList.remove('hidden');
    const video = document.createElement('video');
    video.src = fileURL;
    video.loop = true;
    video.muted = true;
    video.onloadedmetadata = () => {
      loadedVideo = video;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.play();
      renderVideoLoop();
    };
  }
});

// 2. Main Render Pipeline
function render() {
  if (!loadedImage && !loadedVideo) return;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply Transformations
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH, flipV);

  // Apply Filters
  ctx.filter = `
    brightness(${brightness.value}%)
    contrast(${contrast.value}%)
    saturate(${saturate.value}%)
    grayscale(${grayscale.value}%)
    sepia(${sepia.value}%)
    blur(${blur.value}px)
  `.trim();

  // Draw Source Media
  const source = mediaType === 'image' ? loadedImage : loadedVideo;
  if (rotation % 180 !== 0) {
    ctx.drawImage(source, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width);
  } else {
    ctx.drawImage(source, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  }

  ctx.restore();

  // Draw Text Layers
  textLayers.forEach(layer => {
    ctx.font = `${layer.size}px sans-serif`;
    ctx.fillStyle = layer.color;
    ctx.textAlign = 'center';
    ctx.fillText(layer.text, layer.x, layer.y);
  });
}

function renderVideoLoop() {
  if (mediaType === 'video' && loadedVideo && !loadedVideo.paused && !loadedVideo.ended) {
    render();
    updateVideoTime();
    animationFrameId = requestAnimationFrame(renderVideoLoop);
  }
}

// 3. Event Listeners for Filters
[brightness, contrast, saturate, grayscale, sepia, blur].forEach(input => {
  input.addEventListener('input', () => {
    if (mediaType === 'image') render();
  });
});

// 4. Transformations
rotateLeftBtn.addEventListener('click', () => { rotation = (rotation - 90) % 360; render(); });
rotateRightBtn.addEventListener('click', () => { rotation = (rotation + 90) % 360; render(); });
flipHBtn.addEventListener('click', () => { flipH *= -1; render(); });
flipVBtn.addEventListener('click', () => { flipV *= -1; render(); });

// 5. Crop Functionality
cropToggleBtn.addEventListener('click', () => {
  cropBox.classList.toggle('hidden');
});

applyCropBtn.addEventListener('click', () => {
  if (!loadedImage && !loadedVideo) return;

  const rect = canvas.getBoundingClientRect();
  const cropRect = cropBox.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const cropX = (cropRect.left - rect.left) * scaleX;
  const cropY = (cropRect.top - rect.top) * scaleY;
  const cropW = cropRect.width * scaleX;
  const cropH = cropRect.height * scaleY;

  const croppedData = ctx.getImageData(cropX, cropY, cropW, cropH);

  canvas.width = cropW;
  canvas.height = cropH;
  ctx.putImageData(croppedData, 0, 0);

  cropBox.classList.add('hidden');
});

// 6. Text Layers
addTextBtn.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (!text) return;

  textLayers.push({
    text,
    color: textColor.value,
    size: textSize.value,
    x: canvas.width / 2,
    y: canvas.height / 2
  });

  textInput.value = '';
  render();
});

// 7. Video Controls
playPauseBtn.addEventListener('click', () => {
  if (!loadedVideo) return;
  if (loadedVideo.paused) {
    loadedVideo.play();
    renderVideoLoop();
  } else {
    loadedVideo.pause();
    cancelAnimationFrame(animationFrameId);
  }
});

function updateVideoTime() {
  if (!loadedVideo) return;
  const current = formatTime(loadedVideo.currentTime);
  const total = formatTime(loadedVideo.duration || 0);
  videoTime.textContent = `${current} / ${total}`;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// 8. Reset & Export
function resetState() {
  rotation = 0;
  flipH = 1;
  flipV = 1;
  textLayers = [];
  brightness.value = 100;
  contrast.value = 100;
  saturate.value = 100;
  grayscale.value = 0;
  sepia.value = 0;
  blur.value = 0;
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

resetBtn.addEventListener('click', () => {
  resetState();
  render();
});

downloadBtn.addEventListener('click', () => {
  if (!loadedImage && !loadedVideo) return;

  const link = document.createElement('a');
  link.download = mediaType === 'video' ? 'processed-frame.png' : 'edited-image.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});