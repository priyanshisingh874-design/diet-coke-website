// App Configuration
const config = {
    frameCount: 240,
    basePath: './',
    filePrefix: 'ezgif-frame-',
    fileExtension: '.jpg',
    lerpSpeed: 0.1, // Adjust for scroll smoothness (lower = smoother/slower, higher = faster)
    viewportMultipliers: 7 // Total page height in viewports (e.g. 7 * window.innerHeight)
};

// Global State
const state = {
    images: [],
    loadedCount: 0,
    currentFrame: 0,
    targetFrame: 0,
    lastRenderedFrame: -1
};

// DOM Elements
const canvas = document.getElementById('scroll-canvas');
const ctx = canvas.getContext('2d');
const preloader = document.getElementById('preloader');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-percentage');
const scrollContent = document.getElementById('animation-trigger-section');
const sections = document.querySelectorAll('.scroll-section');

// 1. Helper to format frame numbers (e.g. 1 -> 001)
function formatFrameNumber(num) {
    return String(num).padStart(3, '0');
}

// 2. Dynamic aspect-ratio fit (like background-size: cover)
function drawImageCover(ctx, img) {
    const canvas = ctx.canvas;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvas.width / canvas.height;
    
    let drawWidth, drawHeight, drawX, drawY;

    if (imgRatio > canvasRatio) {
        // Image is wider than canvas
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgRatio;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
    } else {
        // Image is taller than canvas
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgRatio;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Smooth image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

// 3. Resize canvas based on viewport dimensions and device pixel ratio
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    
    // CSS layout size
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    
    // Scale drawings if needed or handle in draw function
    const activeFrame = Math.round(state.currentFrame);
    if (state.images[activeFrame]) {
        drawImageCover(ctx, state.images[activeFrame]);
    }
}

// 4. Update the height of the scroll content to define the scroll sensitivity
function updateScrollHeight() {
    const totalHeight = window.innerHeight * config.viewportMultipliers;
    scrollContent.style.height = `${totalHeight}px`;
}

// 5. Preload all 240 frame images
function preloadImages() {
    return new Promise((resolve) => {
        for (let i = 1; i <= config.frameCount; i++) {
            const img = new Image();
            const frameNum = formatFrameNumber(i);
            const path = `${config.basePath}${config.filePrefix}${frameNum}${config.fileExtension}`;
            
            img.src = path;
            img.onload = () => {
                state.loadedCount++;
                const percentage = Math.floor((state.loadedCount / config.frameCount) * 100);
                
                // Update loading UI
                progressBar.style.width = `${percentage}%`;
                progressText.innerText = `${percentage}%`;
                
                if (state.loadedCount === config.frameCount) {
                    resolve();
                }
            };
            
            // Handle loading error (falls back to transparent or placeholder logic)
            img.onerror = () => {
                console.warn(`Failed to load frame ${i} at path ${path}`);
                state.loadedCount++;
                if (state.loadedCount === config.frameCount) {
                    resolve();
                }
            };
            
            state.images.push(img);
        }
    });
}

// 6. Monitor scroll position and map it to target frame index (clamped to trigger section height)
function handleScroll() {
    const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    const maxScrollAnimation = scrollContent.offsetHeight - window.innerHeight;
    
    if (maxScrollAnimation <= 0) return;
    
    // Clamp fraction to [0, 1] so that scrolling the rest of the page doesn't run past frame 240
    const scrollFraction = Math.min(1, Math.max(0, scrollTop / maxScrollAnimation));
    
    // Map fraction to frames
    state.targetFrame = scrollFraction * (config.frameCount - 1);
}

// 7. Toggle visibility of text overlay sections based on active frame range
function updateSections(currentFrameVal) {
    sections.forEach((section) => {
        const start = parseInt(section.getAttribute('data-frame-start'), 10);
        const end = parseInt(section.getAttribute('data-frame-end'), 10);
        
        if (currentFrameVal >= start && currentFrameVal <= end) {
            if (!section.classList.contains('active')) {
                section.classList.add('active');
            }
        } else {
            if (section.classList.contains('active')) {
                section.classList.remove('active');
            }
        }
    });
}

// 8. Animation and Render Loop (Lerp + Frame Update)
function animLoop() {
    // Apply linear interpolation for buttery smooth scroll animations
    const diff = state.targetFrame - state.currentFrame;
    state.currentFrame += diff * config.lerpSpeed;
    
    // Snap to target if very close to avoid continuous tiny draw cycles
    if (Math.abs(state.targetFrame - state.currentFrame) < 0.005) {
        state.currentFrame = state.targetFrame;
    }
    
    const frameToRender = Math.round(state.currentFrame);
    
    // Only render frame if it differs from the last rendered frame to conserve CPU/GPU resources
    if (frameToRender !== state.lastRenderedFrame) {
        const img = state.images[frameToRender];
        if (img && img.complete && img.naturalWidth !== 0) {
            drawImageCover(ctx, img);
            state.lastRenderedFrame = frameToRender;
            
            // Sync text section overlays with active frame
            updateSections(frameToRender);
        }
    }
    
    requestAnimationFrame(animLoop);
}

// 9. Initialize Application
async function init() {
    // Set heights and resize sizes immediately
    updateScrollHeight();
    resizeCanvas();
    
    // Event listeners
    window.addEventListener('resize', () => {
        updateScrollHeight();
        resizeCanvas();
    });
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Preload all frames
    await preloadImages();
    
    // Small delay to let the loading transition feel elegant
    setTimeout(() => {
        preloader.classList.add('fade-out');
        
        // Initial drawing of the first frame
        if (state.images[0]) {
            drawImageCover(ctx, state.images[0]);
            updateSections(0);
        }
        
        // Start animation loop
        requestAnimationFrame(animLoop);
    }, 400);
}

// Start app once DOM is ready
document.addEventListener('DOMContentLoaded', init);
