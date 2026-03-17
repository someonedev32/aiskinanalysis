/**
 * AI Skin Analysis - App Embed JavaScript
 * Floating widget with camera capture and AI analysis
 */

(function() {
  'use strict';

  const wrapper = document.getElementById('ai-skin-analysis-embed');
  if (!wrapper) return;

  // Configuration
  const config = {
    proxyUrl: wrapper.dataset.appProxyUrl,
    shop: wrapper.dataset.shop,
    collectionId: wrapper.dataset.collectionId || '',
    position: wrapper.dataset.position || 'bottom-right',
    showOnMobile: wrapper.dataset.showOnMobile !== 'false'
  };

  // Elements
  const trigger = wrapper.querySelector('.skin-analysis-trigger');
  const modal = wrapper.querySelector('.skin-analysis-modal');
  const closeBtn = wrapper.querySelector('.skin-analysis-close');
  const video = wrapper.querySelector('[data-video]');
  const canvas = wrapper.querySelector('[data-canvas]');
  const placeholder = wrapper.querySelector('[data-placeholder]');
  const faceGuide = wrapper.querySelector('[data-face-guide]');
  const scanOverlay = wrapper.querySelector('[data-scan-overlay]');
  const startBtn = wrapper.querySelector('[data-start-btn]');
  const captureBtn = wrapper.querySelector('[data-capture-btn]');
  const retryBtn = wrapper.querySelector('[data-retry-btn]');
  const cameraSection = wrapper.querySelector('[data-camera-section]');
  const loadingSection = wrapper.querySelector('[data-loading-section]');
  const resultsSection = wrapper.querySelector('[data-results-section]');

  let stream = null;

  // Apply position
  wrapper.classList.add('position-' + config.position);

  // Hide on mobile if disabled
  if (!config.showOnMobile && window.innerWidth < 768) {
    wrapper.style.display = 'none';
  }

  // Open modal
  trigger.addEventListener('click', () => {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  // Close modal
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    stopCamera();
    resetUI();
  }

  // Start camera
  startBtn.addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video.srcObject = stream;
      video.style.display = 'block';
      placeholder.style.display = 'none';
      faceGuide.style.display = 'block';
      startBtn.style.display = 'none';
      captureBtn.style.display = 'inline-flex';
    } catch (err) {
      alert('Unable to access camera. Please grant camera permissions.');
    }
  });

  // Capture and analyze
  captureBtn.addEventListener('click', async () => {
    if (!stream || !video) return;

    // Show scanning animation
    scanOverlay.style.display = 'block';
    captureBtn.disabled = true;
    captureBtn.textContent = 'Scanning...';

    await new Promise(r => setTimeout(r, 1500));

    // Capture frame
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    stopCamera();
    cameraSection.style.display = 'none';
    loadingSection.style.display = 'flex';

    // Build URL
    let analyzeUrl = config.proxyUrl + '/analyze?shop=' + encodeURIComponent(config.shop);
    if (config.collectionId) {
      analyzeUrl += '&collection_id=' + encodeURIComponent(config.collectionId);
    }

    try {
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });

      const data = await response.json();

      if (data.success) {
        displayResults(data.result, data.products || []);
      } else {
        showError(data.message || 'Analysis failed. Please try again.');
      }
    } catch (error) {
      showError('Connection error. Please try again.');
    }
  });

  // Retry
  retryBtn.addEventListener('click', () => {
    resultsSection.style.display = 'none';
    cameraSection.style.display = 'block';
    resetUI();
  });

  function displayResults(result, products) {
    loadingSection.style.display = 'none';
    resultsSection.style.display = 'block';

    // Score
    const scoreEl = wrapper.querySelector('[data-score] .score-value');
    if (scoreEl) scoreEl.textContent = result.score || 75;

    // Skin type
    const skinTypeEl = wrapper.querySelector('[data-skin-type] .detail-value');
    if (skinTypeEl) skinTypeEl.textContent = result.skin_type || 'Normal';

    // Concerns
    const concernsEl = wrapper.querySelector('[data-concerns] .concerns-tags');
    if (concernsEl && result.concerns) {
      concernsEl.innerHTML = result.concerns.map(c => 
        '<span class="concern-tag">' + escapeHtml(c) + '</span>'
      ).join('');
    }

    // Routine
    const routineEl = wrapper.querySelector('[data-routine] .routine-steps');
    if (routineEl) {
      const routine = [...(result.am_routine || []), ...(result.pm_routine || [])].slice(0, 4);
      routineEl.innerHTML = routine.map((step, i) => 
        '<div class="routine-step"><span class="step-num">' + (i + 1) + '</span>' +
        '<span class="step-text">' + escapeHtml(step.product_type) + '</span></div>'
      ).join('');
    }

    // Products
    if (products && products.length > 0) {
      const productsSection = wrapper.querySelector('[data-products]');
      const productsGrid = wrapper.querySelector('[data-products] .products-grid');
      if (productsSection && productsGrid) {
        productsGrid.innerHTML = products.slice(0, 3).map(p => 
          '<a href="/products/' + escapeHtml(p.handle) + '" class="product-card">' +
          '<img src="' + escapeHtml(p.image_url || '') + '" alt="' + escapeHtml(p.title) + '">' +
          '<span>' + escapeHtml(p.title) + '</span></a>'
        ).join('');
        productsSection.style.display = 'block';
      }
    }
  }

  function showError(message) {
    loadingSection.style.display = 'none';
    cameraSection.style.display = 'block';
    resetUI();
    alert(message);
  }

  function resetUI() {
    if (video) video.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (faceGuide) faceGuide.style.display = 'none';
    if (scanOverlay) scanOverlay.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-flex';
    if (captureBtn) {
      captureBtn.style.display = 'none';
      captureBtn.disabled = false;
      captureBtn.textContent = 'Analyze My Skin';
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', stopCamera);

})();
