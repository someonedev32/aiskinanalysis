/**
 * AI Skin Analysis - Professional Theme Extension JavaScript
 * Handles camera, analysis API, and results rendering
 */

(function() {
  'use strict';

  // Configuration
  const wrapper = document.getElementById('lumina-skin-analysis');
  if (!wrapper) return;

  const PROXY_URL = wrapper.dataset.appProxyUrl;
  const SHOP = wrapper.dataset.shop;

  // DOM Elements
  const video = document.getElementById('lumina-video');
  const canvas = document.getElementById('lumina-canvas');
  const placeholder = document.getElementById('lumina-placeholder');
  const cameraFrame = document.getElementById('lumina-camera-frame');
  const scanOverlay = document.getElementById('lumina-scan-overlay');
  const faceGuide = document.querySelector('.lumina-face-guide');
  
  const startBtn = document.getElementById('lumina-start-btn');
  const captureBtn = document.getElementById('lumina-capture-btn');
  const retryBtn = document.getElementById('lumina-retry-btn');
  
  const cameraSection = document.getElementById('lumina-camera-section');
  const loadingSection = document.getElementById('lumina-loading');
  const resultsSection = document.getElementById('lumina-results');

  let stream = null;

  // Start Camera
  window.luminaStartCamera = async function() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      video.srcObject = stream;
      video.style.display = 'block';
      placeholder.style.display = 'none';
      cameraFrame.classList.add('active');
      
      if (faceGuide) faceGuide.style.display = 'block';
      
      startBtn.style.display = 'none';
      captureBtn.style.display = 'inline-flex';
      
    } catch (err) {
      console.error('Camera error:', err);
      alert('Unable to access camera. Please ensure camera permissions are granted.');
    }
  };

  // Capture Image
  window.luminaCapture = async function() {
    if (!stream) return;

    // Show scanning animation
    scanOverlay.style.display = 'block';
    captureBtn.disabled = true;
    captureBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Scanning...';
    
    // Wait for scan animation
    await new Promise(r => setTimeout(r, 1500));

    // Capture frame
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    const base64 = imageData.split(',')[1];

    // Stop camera
    stopCamera();

    // Show loading
    cameraSection.style.display = 'none';
    loadingSection.style.display = 'flex';

    // Send for analysis
    try {
      const response = await fetch(`${PROXY_URL}/analyze?shop=${SHOP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        displayResults(data.result, data.products || []);
      } else {
        throw new Error(data.detail || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Analysis failed: ' + error.message);
      luminaRetry();
    }
  };

  // Display Results
  function displayResults(result, products) {
    loadingSection.style.display = 'none';
    resultsSection.style.display = 'block';

    // Score
    const scoreEl = document.getElementById('lumina-score');
    scoreEl.innerHTML = `
      <div class="lumina-score-value">${result.score || 75}</div>
      <div class="lumina-score-label">out of 100</div>
    `;

    // Skin Type
    const skinTypeEl = document.querySelector('#lumina-skin-type .lumina-card-content');
    const severityClass = (result.severity || 'mild').toLowerCase();
    skinTypeEl.innerHTML = `
      <span class="lumina-badge">${result.skin_type || 'Normal'}</span>
      <span class="lumina-severity lumina-severity-${severityClass}">${result.severity || 'Mild'}</span>
    `;

    // Concerns
    const concernsEl = document.querySelector('#lumina-concerns .lumina-card-content');
    const concerns = result.concerns || [];
    concernsEl.innerHTML = concerns.map(c => `<span class="lumina-tag">${c}</span>`).join('');

    // Ingredients
    const ingredientsEl = document.querySelector('#lumina-ingredients .lumina-card-content');
    const ingredients = result.ingredient_recommendations || [];
    ingredientsEl.innerHTML = ingredients.map(i => `
      <div class="lumina-ingredient">
        <strong>${i.name}</strong>
        <span>${i.benefit}</span>
      </div>
    `).join('');

    // AM Routine
    const amEl = document.querySelector('#lumina-am-routine .lumina-card-content');
    const amRoutine = result.am_routine || [];
    amEl.innerHTML = amRoutine.map((step, idx) => `
      <div class="lumina-step">
        <div class="lumina-step-num">${idx + 1}</div>
        <div class="lumina-step-content">
          <strong>${step.product_type}</strong>
          <span>${step.description}</span>
        </div>
      </div>
    `).join('');

    // PM Routine
    const pmEl = document.querySelector('#lumina-pm-routine .lumina-card-content');
    const pmRoutine = result.pm_routine || [];
    pmEl.innerHTML = pmRoutine.map((step, idx) => `
      <div class="lumina-step">
        <div class="lumina-step-num">${idx + 1}</div>
        <div class="lumina-step-content">
          <strong>${step.product_type}</strong>
          <span>${step.description}</span>
        </div>
      </div>
    `).join('');

    // Summary
    const summaryEl = document.querySelector('#lumina-summary p');
    summaryEl.textContent = result.summary || 'Analysis complete. Follow the recommended routine for best results.';

    // Products (if available)
    if (products && products.length > 0) {
      const productsSection = document.getElementById('lumina-products');
      const productsGrid = productsSection.querySelector('.lumina-products-grid');
      
      productsGrid.innerHTML = products.map(p => `
        <a href="/products/${p.handle}" class="lumina-product-card">
          <img src="${p.image_url || 'https://via.placeholder.com/200'}" alt="${p.title}" class="lumina-product-image">
          <div class="lumina-product-title">${p.title}</div>
          <div class="lumina-product-price">$${p.price}</div>
        </a>
      `).join('');
      
      productsSection.style.display = 'block';
    }

    // Show retry button
    retryBtn.style.display = 'inline-flex';
    retryBtn.style.margin = '2rem auto 0';
    retryBtn.style.display = 'flex';
    resultsSection.appendChild(retryBtn);
  }

  // Retry / Start Over
  window.luminaRetry = function() {
    stopCamera();
    
    resultsSection.style.display = 'none';
    loadingSection.style.display = 'none';
    cameraSection.style.display = 'block';
    
    video.style.display = 'none';
    placeholder.style.display = 'flex';
    cameraFrame.classList.remove('active');
    if (faceGuide) faceGuide.style.display = 'none';
    scanOverlay.style.display = 'none';
    
    startBtn.style.display = 'inline-flex';
    captureBtn.style.display = 'none';
    captureBtn.disabled = false;
    captureBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Analyze My Skin';
    retryBtn.style.display = 'none';
    
    // Move retry button back to controls
    document.querySelector('.lumina-controls').appendChild(retryBtn);
  };

  // Stop Camera
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', stopCamera);

})();
