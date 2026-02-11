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
  const COLLECTION_ID = wrapper.dataset.collectionId || '';

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

    // Build URL with collection_id if available
    let analyzeUrl = `${PROXY_URL}/analyze?shop=${SHOP}`;
    if (COLLECTION_ID) {
      analyzeUrl += `&collection_id=${COLLECTION_ID}`;
    }

    // Send for analysis
    try {
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        const errorMessage = data.detail || 'Analysis failed';
        
        if (response.status === 400) {
          // No face detected or image quality issue
          showError(errorMessage, true);
        } else if (response.status === 429) {
          // Rate limit or quota exceeded
          showError('Service is busy. Please wait a moment and try again.', true);
        } else {
          // Other errors
          showError(errorMessage, true);
        }
        return;
      }
      
      if (data.success) {
        displayResults(data.result, data.products || []);
      } else if (data.error === 'no_face') {
        // No face detected - show friendly message with retry
        showError(data.message || 'No clear face detected. Please ensure your face is well-lit, centered, and clearly visible.', true);
      } else {
        showError(data.detail || data.message || 'Analysis failed. Please try again.', true);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      showError('Connection error. Please check your internet and try again.', true);
    }
  };

  // Show error message with retry option
  function showError(message, allowRetry) {
    loadingSection.style.display = 'none';
    cameraSection.style.display = 'block';
    
    // Reset camera UI
    video.style.display = 'none';
    placeholder.style.display = 'flex';
    cameraFrame.classList.remove('active');
    if (faceGuide) faceGuide.style.display = 'none';
    scanOverlay.style.display = 'none';
    
    startBtn.style.display = 'inline-flex';
    captureBtn.style.display = 'none';
    captureBtn.disabled = false;
    captureBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Analyze My Skin';
    
    // Show error in a user-friendly way
    const errorHtml = `
      <div class="lumina-error-message" style="
        background: linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%);
        border: 1px solid #FC8181;
        border-radius: 12px;
        padding: 20px;
        margin: 20px auto;
        max-width: 400px;
        text-align: center;
      ">
        <svg viewBox="0 0 24 24" fill="none" stroke="#E53E3E" stroke-width="2" style="width: 48px; height: 48px; margin: 0 auto 12px;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style="color: #C53030; font-weight: 600; font-size: 16px; margin-bottom: 8px;">Unable to Analyze</p>
        <p style="color: #742A2A; font-size: 14px; margin-bottom: 16px;">${message}</p>
        <p style="color: #9B2C2C; font-size: 12px;">Tips for a better scan:</p>
        <ul style="color: #742A2A; font-size: 12px; text-align: left; padding-left: 20px; margin-top: 8px;">
          <li>Ensure good lighting on your face</li>
          <li>Position your face in the center of the frame</li>
          <li>Remove glasses if possible</li>
          <li>Hold the camera steady</li>
        </ul>
      </div>
    `;
    
    // Remove any existing error message
    const existingError = document.querySelector('.lumina-error-message');
    if (existingError) existingError.remove();
    
    // Insert error message
    cameraSection.insertAdjacentHTML('afterbegin', errorHtml);
    
    // Auto-remove error after 10 seconds
    setTimeout(() => {
      const errorEl = document.querySelector('.lumina-error-message');
      if (errorEl) errorEl.remove();
    }, 10000);
  }

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
        <div class="lumina-product-card" data-product-id="${p.id}" data-variant-id="${p.variant_id || ''}">
          <a href="/products/${p.handle}" class="lumina-product-link">
            <img src="${p.image_url || 'https://via.placeholder.com/200'}" alt="${p.title}" class="lumina-product-image">
            <div class="lumina-product-title">${p.title}</div>
          </a>
          <button class="lumina-add-to-cart-btn" onclick="luminaAddToCart(this, '${p.handle}', '${p.variant_id || ''}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Add to Cart
          </button>
        </div>
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

  // Add to Cart function
  window.luminaAddToCart = async function(button, handle, variantId) {
    const card = button.closest('.lumina-product-card');
    button.disabled = true;
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;animation:luminaSpin 1s linear infinite;"><circle cx="12" cy="12" r="10"/></svg> Adding...';
    
    try {
      // If no variant ID, fetch it from product
      if (!variantId) {
        const productResponse = await fetch(`/products/${handle}.js`);
        const productData = await productResponse.json();
        variantId = productData.variants[0].id;
      }
      
      // Add to cart
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: variantId,
          quantity: 1
        })
      });
      
      if (response.ok) {
        // Success - change to View Cart button
        button.classList.add('lumina-view-cart-btn');
        button.classList.remove('lumina-add-to-cart-btn');
        button.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          View Cart
        `;
        button.disabled = false;
        button.onclick = function() { window.location.href = '/cart'; };
        
        // Update cart count in header if exists
        const cartCountEl = document.querySelector('.cart-count, .cart-item-count, [data-cart-count]');
        if (cartCountEl) {
          const currentCount = parseInt(cartCountEl.textContent) || 0;
          cartCountEl.textContent = currentCount + 1;
        }
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      button.disabled = false;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        Add to Cart
      `;
      // Fallback: open product page
      window.location.href = `/products/${handle}`;
    }
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
