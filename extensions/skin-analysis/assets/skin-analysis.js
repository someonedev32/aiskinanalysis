/**
 * AI Skin Analysis - Theme App Extension JavaScript
 * Handles camera capture, API calls, and results rendering
 * Supports multiple instances per page via data attributes
 */

(function() {
  'use strict';

  // Initialize all skin analysis widgets on the page
  function initAllWidgets() {
    const widgets = document.querySelectorAll('.lumina-wrapper[data-app-proxy-url]');
    widgets.forEach(initWidget);
  }

  // Initialize a single widget
  function initWidget(wrapper) {
    if (!wrapper || wrapper.dataset.initialized) return;
    wrapper.dataset.initialized = 'true';

    // Configuration from data attributes
    const config = {
      proxyUrl: wrapper.dataset.appProxyUrl,
      shop: wrapper.dataset.shop,
      collectionId: wrapper.dataset.collectionId || '',
      blockId: wrapper.dataset.blockId || 'default'
    };

    // Validate required config
    if (!config.proxyUrl || !config.shop) {
      console.error('AI Skin Analysis: Missing required configuration');
      return;
    }

    // DOM Elements using data attributes (scoped to this wrapper)
    const elements = {
      video: wrapper.querySelector('[data-video]'),
      canvas: wrapper.querySelector('[data-canvas]'),
      placeholder: wrapper.querySelector('[data-placeholder]'),
      cameraFrame: wrapper.querySelector('[data-camera-frame]'),
      scanOverlay: wrapper.querySelector('[data-scan-overlay]'),
      faceGuide: wrapper.querySelector('[data-face-guide]'),
      startBtn: wrapper.querySelector('[data-start-btn]'),
      captureBtn: wrapper.querySelector('[data-capture-btn]'),
      retryBtn: wrapper.querySelector('[data-retry-btn]'),
      cameraSection: wrapper.querySelector('[data-camera-section]'),
      loadingSection: wrapper.querySelector('[data-loading-section]'),
      resultsSection: wrapper.querySelector('[data-results-section]'),
      score: wrapper.querySelector('[data-score]'),
      skinType: wrapper.querySelector('[data-skin-type]'),
      concerns: wrapper.querySelector('[data-concerns]'),
      ingredients: wrapper.querySelector('[data-ingredients]'),
      amRoutine: wrapper.querySelector('[data-am-routine]'),
      pmRoutine: wrapper.querySelector('[data-pm-routine]'),
      summary: wrapper.querySelector('[data-summary]'),
      products: wrapper.querySelector('[data-products]')
    };

    // State
    let stream = null;

    // Bind event listeners
    if (elements.startBtn) {
      elements.startBtn.addEventListener('click', startCamera);
    }
    if (elements.captureBtn) {
      elements.captureBtn.addEventListener('click', captureAndAnalyze);
    }
    if (elements.retryBtn) {
      elements.retryBtn.addEventListener('click', retry);
    }

    // Start Camera
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (elements.video) {
          elements.video.srcObject = stream;
          elements.video.style.display = 'block';
        }
        if (elements.placeholder) {
          elements.placeholder.style.display = 'none';
        }
        if (elements.cameraFrame) {
          elements.cameraFrame.classList.add('active');
        }
        if (elements.faceGuide) {
          elements.faceGuide.style.display = 'block';
        }
        if (elements.startBtn) {
          elements.startBtn.style.display = 'none';
        }
        if (elements.captureBtn) {
          elements.captureBtn.style.display = 'inline-flex';
        }
        
      } catch (err) {
        console.error('Camera error:', err);
        showError('Unable to access camera. Please ensure camera permissions are granted and try again.');
      }
    }

    // Capture Image and Analyze
    async function captureAndAnalyze() {
      if (!stream || !elements.video || !elements.canvas) return;

      // Show scanning animation
      if (elements.scanOverlay) {
        elements.scanOverlay.style.display = 'block';
      }
      if (elements.captureBtn) {
        elements.captureBtn.disabled = true;
        elements.captureBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;"><circle cx="12" cy="12" r="10"/></svg> Scanning...';
      }
      
      // Wait for scan animation
      await new Promise(r => setTimeout(r, 1500));

      // Capture frame
      const ctx = elements.canvas.getContext('2d');
      elements.canvas.width = elements.video.videoWidth;
      elements.canvas.height = elements.video.videoHeight;
      ctx.drawImage(elements.video, 0, 0);
      
      const imageData = elements.canvas.toDataURL('image/jpeg', 0.8);
      const base64 = imageData.split(',')[1];

      // Stop camera
      stopCamera();

      // Show loading
      if (elements.cameraSection) {
        elements.cameraSection.style.display = 'none';
      }
      if (elements.loadingSection) {
        elements.loadingSection.style.display = 'flex';
      }

      // Build URL with collection_id if available
      let analyzeUrl = config.proxyUrl + '/analyze?shop=' + encodeURIComponent(config.shop);
      if (config.collectionId) {
        analyzeUrl += '&collection_id=' + encodeURIComponent(config.collectionId);
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
          const errorMessage = data.detail || data.message || 'Analysis failed';
          showError(errorMessage);
          return;
        }
        
        if (data.success) {
          displayResults(data.result, data.products || []);
        } else if (data.error === 'no_face') {
          showError(data.message || 'No clear face detected. Please ensure your face is well-lit, centered, and clearly visible.');
        } else {
          showError(data.detail || data.message || 'Analysis failed. Please try again.');
        }
      } catch (error) {
        console.error('Analysis error:', error);
        showError('Connection error. Please check your internet and try again.');
      }
    }

    // Show error message
    function showError(message) {
      if (elements.loadingSection) {
        elements.loadingSection.style.display = 'none';
      }
      if (elements.cameraSection) {
        elements.cameraSection.style.display = 'block';
      }
      
      // Reset camera UI
      resetCameraUI();
      
      // Show error in a user-friendly way
      const errorHtml = 
        '<div class="lumina-error-message" style="' +
        'background: linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%);' +
        'border: 1px solid #FC8181;' +
        'border-radius: 12px;' +
        'padding: 20px;' +
        'margin: 20px auto;' +
        'max-width: 400px;' +
        'text-align: center;">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="#E53E3E" stroke-width="2" style="width: 48px; height: 48px; margin: 0 auto 12px; display: block;">' +
        '<circle cx="12" cy="12" r="10"/>' +
        '<line x1="12" y1="8" x2="12" y2="12"/>' +
        '<line x1="12" y1="16" x2="12.01" y2="16"/>' +
        '</svg>' +
        '<p style="color: #C53030; font-weight: 600; font-size: 16px; margin: 0 0 8px 0;">Unable to Analyze</p>' +
        '<p style="color: #742A2A; font-size: 14px; margin: 0 0 16px 0;">' + escapeHtml(message) + '</p>' +
        '<p style="color: #9B2C2C; font-size: 12px; margin: 0 0 8px 0;">Tips for a better scan:</p>' +
        '<ul style="color: #742A2A; font-size: 12px; text-align: left; padding-left: 20px; margin: 0;">' +
        '<li>Ensure good lighting on your face</li>' +
        '<li>Position your face in the center</li>' +
        '<li>Remove glasses if possible</li>' +
        '<li>Hold the camera steady</li>' +
        '</ul>' +
        '</div>';
      
      // Remove any existing error message
      const existingError = wrapper.querySelector('.lumina-error-message');
      if (existingError) existingError.remove();
      
      // Insert error message
      if (elements.cameraSection) {
        elements.cameraSection.insertAdjacentHTML('afterbegin', errorHtml);
      }
      
      // Auto-remove error after 10 seconds
      setTimeout(function() {
        const errorEl = wrapper.querySelector('.lumina-error-message');
        if (errorEl) errorEl.remove();
      }, 10000);
    }

    // Display Results
    function displayResults(result, products) {
      if (elements.loadingSection) {
        elements.loadingSection.style.display = 'none';
      }
      if (elements.resultsSection) {
        elements.resultsSection.style.display = 'block';
      }

      // Score
      if (elements.score) {
        elements.score.innerHTML = 
          '<div class="lumina-score-value">' + (result.score || 75) + '</div>' +
          '<div class="lumina-score-label">out of 100</div>';
      }

      // Skin Type
      if (elements.skinType) {
        const contentEl = elements.skinType.querySelector('.lumina-card-content');
        if (contentEl) {
          const severityClass = (result.severity || 'mild').toLowerCase();
          contentEl.innerHTML = 
            '<span class="lumina-badge">' + escapeHtml(result.skin_type || 'Normal') + '</span>' +
            '<span class="lumina-severity lumina-severity-' + severityClass + '">' + escapeHtml(result.severity || 'Mild') + '</span>';
        }
      }

      // Concerns
      if (elements.concerns) {
        const contentEl = elements.concerns.querySelector('.lumina-card-content');
        if (contentEl) {
          const concerns = result.concerns || [];
          contentEl.innerHTML = concerns.map(function(c) {
            return '<span class="lumina-tag">' + escapeHtml(c) + '</span>';
          }).join('');
        }
      }

      // Ingredients
      if (elements.ingredients) {
        const contentEl = elements.ingredients.querySelector('.lumina-card-content');
        if (contentEl) {
          const ingredients = result.ingredient_recommendations || [];
          contentEl.innerHTML = ingredients.map(function(i) {
            return '<div class="lumina-ingredient">' +
              '<strong>' + escapeHtml(i.name) + '</strong>' +
              '<span>' + escapeHtml(i.benefit) + '</span>' +
              '</div>';
          }).join('');
        }
      }

      // AM Routine
      if (elements.amRoutine) {
        const contentEl = elements.amRoutine.querySelector('.lumina-card-content');
        if (contentEl) {
          const amRoutine = result.am_routine || [];
          contentEl.innerHTML = amRoutine.map(function(step, idx) {
            return '<div class="lumina-step">' +
              '<div class="lumina-step-num">' + (idx + 1) + '</div>' +
              '<div class="lumina-step-content">' +
              '<strong>' + escapeHtml(step.product_type) + '</strong>' +
              '<span>' + escapeHtml(step.description) + '</span>' +
              '</div></div>';
          }).join('');
        }
      }

      // PM Routine
      if (elements.pmRoutine) {
        const contentEl = elements.pmRoutine.querySelector('.lumina-card-content');
        if (contentEl) {
          const pmRoutine = result.pm_routine || [];
          contentEl.innerHTML = pmRoutine.map(function(step, idx) {
            return '<div class="lumina-step">' +
              '<div class="lumina-step-num">' + (idx + 1) + '</div>' +
              '<div class="lumina-step-content">' +
              '<strong>' + escapeHtml(step.product_type) + '</strong>' +
              '<span>' + escapeHtml(step.description) + '</span>' +
              '</div></div>';
          }).join('');
        }
      }

      // Summary
      if (elements.summary) {
        const pEl = elements.summary.querySelector('p');
        if (pEl) {
          pEl.textContent = result.summary || 'Analysis complete. Follow the recommended routine for best results.';
        }
      }

      // Products (if available)
      if (products && products.length > 0 && elements.products) {
        const productsGrid = elements.products.querySelector('.lumina-products-grid');
        if (productsGrid) {
          productsGrid.innerHTML = products.map(function(p) {
            return '<div class="lumina-product-card" data-product-handle="' + escapeHtml(p.handle) + '" data-variant-id="' + escapeHtml(p.variant_id || '') + '">' +
              '<a href="/products/' + escapeHtml(p.handle) + '" class="lumina-product-link">' +
              '<img src="' + escapeHtml(p.image_url || 'https://via.placeholder.com/200') + '" alt="' + escapeHtml(p.title) + '" class="lumina-product-image">' +
              '<div class="lumina-product-title">' + escapeHtml(p.title) + '</div>' +
              '</a>' +
              '<button type="button" class="lumina-add-to-cart-btn" data-add-to-cart>' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">' +
              '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
              '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
              '</svg> Add to Cart</button>' +
              '</div>';
          }).join('');
          
          // Bind add to cart buttons
          productsGrid.querySelectorAll('[data-add-to-cart]').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
              e.preventDefault();
              addToCart(btn);
            });
          });
        }
        
        elements.products.style.display = 'block';
      }

      // Show retry button
      if (elements.retryBtn) {
        elements.retryBtn.style.display = 'inline-flex';
        elements.retryBtn.style.margin = '2rem auto 0';
        if (elements.resultsSection) {
          elements.resultsSection.appendChild(elements.retryBtn);
        }
      }
    }

    // Retry / Start Over
    function retry() {
      stopCamera();
      
      if (elements.resultsSection) {
        elements.resultsSection.style.display = 'none';
      }
      if (elements.loadingSection) {
        elements.loadingSection.style.display = 'none';
      }
      if (elements.cameraSection) {
        elements.cameraSection.style.display = 'block';
      }
      
      resetCameraUI();
      
      // Move retry button back to controls
      const controls = wrapper.querySelector('.lumina-controls');
      if (controls && elements.retryBtn) {
        controls.appendChild(elements.retryBtn);
      }
    }

    // Reset camera UI
    function resetCameraUI() {
      if (elements.video) {
        elements.video.style.display = 'none';
      }
      if (elements.placeholder) {
        elements.placeholder.style.display = 'flex';
      }
      if (elements.cameraFrame) {
        elements.cameraFrame.classList.remove('active');
      }
      if (elements.faceGuide) {
        elements.faceGuide.style.display = 'none';
      }
      if (elements.scanOverlay) {
        elements.scanOverlay.style.display = 'none';
      }
      if (elements.startBtn) {
        elements.startBtn.style.display = 'inline-flex';
      }
      if (elements.captureBtn) {
        elements.captureBtn.style.display = 'none';
        elements.captureBtn.disabled = false;
        elements.captureBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Analyze My Skin';
      }
      if (elements.retryBtn) {
        elements.retryBtn.style.display = 'none';
      }
    }

    // Add to Cart function
    async function addToCart(button) {
      const card = button.closest('.lumina-product-card');
      if (!card) return;
      
      const handle = card.dataset.productHandle;
      let variantId = card.dataset.variantId;
      
      button.disabled = true;
      button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;animation:luminaSpin 1s linear infinite;"><circle cx="12" cy="12" r="10"/></svg> Adding...';
      
      try {
        // If no variant ID, fetch it from product
        if (!variantId) {
          const productResponse = await fetch('/products/' + handle + '.js');
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
          button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><polyline points="20 6 9 17 4 12"/></svg> View Cart';
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
        button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add to Cart';
        // Fallback: open product page
        window.location.href = '/products/' + handle;
      }
    }

    // Stop Camera
    function stopCamera() {
      if (stream) {
        stream.getTracks().forEach(function(track) { track.stop(); });
        stream = null;
      }
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', stopCamera);
  }

  // Escape HTML helper
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllWidgets);
  } else {
    initAllWidgets();
  }

  // Also watch for dynamically added widgets (for theme editor preview)
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            if (node.classList && node.classList.contains('lumina-wrapper')) {
              initWidget(node);
            }
            const widgets = node.querySelectorAll ? node.querySelectorAll('.lumina-wrapper[data-app-proxy-url]') : [];
            widgets.forEach(initWidget);
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

})();
