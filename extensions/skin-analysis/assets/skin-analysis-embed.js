/**
 * AI Skin Analysis - App Embed JavaScript
 */

(function() {
  'use strict';

  var widget = document.getElementById('ai-skin-analysis-widget');
  if (!widget) return;

  var apiUrl = widget.dataset.apiUrl;
  var shopDomain = widget.dataset.shop;

  // Elements
  var trigger = document.getElementById('skin-analysis-trigger');
  var modal = document.getElementById('skin-analysis-modal');
  var closeBtn = document.getElementById('skin-close-btn');
  var video = document.getElementById('skin-video');
  var canvas = document.getElementById('skin-canvas');
  var placeholder = document.getElementById('skin-placeholder');
  var faceGuide = document.getElementById('skin-face-guide');
  var scanOverlay = document.getElementById('skin-scan-overlay');
  var startBtn = document.getElementById('skin-start-btn');
  var captureBtn = document.getElementById('skin-capture-btn');
  var retryBtn = document.getElementById('skin-retry-btn');
  var cameraSection = document.getElementById('skin-camera-section');
  var loadingSection = document.getElementById('skin-loading-section');
  var resultsSection = document.getElementById('skin-results-section');

  var stream = null;

  // Open modal
  trigger.addEventListener('click', function() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  // Close modal
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  });

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    stopCamera();
    resetUI();
  }

  // Start camera
  startBtn.addEventListener('click', function() {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
    }).then(function(s) {
      stream = s;
      video.srcObject = stream;
      video.style.display = 'block';
      placeholder.style.display = 'none';
      faceGuide.style.display = 'block';
      startBtn.style.display = 'none';
      captureBtn.style.display = 'inline-flex';
    }).catch(function(err) {
      alert('Unable to access camera. Please allow camera permissions.');
    });
  });

  // Capture and analyze
  captureBtn.addEventListener('click', function() {
    if (!stream || !video) return;

    scanOverlay.style.display = 'block';
    captureBtn.disabled = true;
    captureBtn.textContent = 'Scanning...';

    setTimeout(function() {
      var ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      var base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      stopCamera();
      cameraSection.style.display = 'none';
      loadingSection.style.display = 'flex';

      var analyzeUrl = apiUrl + '/api/proxy/analyze?shop=' + encodeURIComponent(shopDomain);

      fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          displayResults(data.result, data.products || []);
        } else {
          showError(data.message || 'Analysis failed');
        }
      })
      .catch(function(err) {
        showError('Connection error. Please try again.');
      });
    }, 1500);
  });

  // Retry
  retryBtn.addEventListener('click', function() {
    resultsSection.style.display = 'none';
    cameraSection.style.display = 'block';
    resetUI();
  });

  function displayResults(result, products) {
    loadingSection.style.display = 'none';
    resultsSection.style.display = 'block';

    document.getElementById('skin-score-value').textContent = result.score || 75;
    document.getElementById('skin-type-value').textContent = result.skin_type || 'Normal';

    var concernsEl = document.getElementById('skin-concerns-tags');
    if (result.concerns && result.concerns.length > 0) {
      concernsEl.innerHTML = result.concerns.map(function(c) {
        return '<span class="concern-tag">' + escapeHtml(c) + '</span>';
      }).join('');
    }

    var routineEl = document.getElementById('skin-routine-steps');
    var routine = (result.am_routine || []).concat(result.pm_routine || []).slice(0, 4);
    routineEl.innerHTML = routine.map(function(step, i) {
      return '<div class="routine-step"><span class="step-num">' + (i + 1) + '</span>' +
             '<span class="step-text">' + escapeHtml(step.product_type) + '</span></div>';
    }).join('');

    if (products && products.length > 0) {
      var productsSection = document.getElementById('skin-products-section');
      var productsGrid = document.getElementById('skin-products-grid');
      productsGrid.innerHTML = products.slice(0, 3).map(function(p) {
        return '<a href="/products/' + escapeHtml(p.handle) + '" class="product-card">' +
               '<img src="' + escapeHtml(p.image_url || '') + '" alt="' + escapeHtml(p.title) + '">' +
               '<span>' + escapeHtml(p.title) + '</span></a>';
      }).join('');
      productsSection.style.display = 'block';
    }
  }

  function showError(message) {
    loadingSection.style.display = 'none';
    cameraSection.style.display = 'block';
    resetUI();
    alert(message);
  }

  function resetUI() {
    video.style.display = 'none';
    placeholder.style.display = 'flex';
    faceGuide.style.display = 'none';
    scanOverlay.style.display = 'none';
    startBtn.style.display = 'inline-flex';
    captureBtn.style.display = 'none';
    captureBtn.disabled = false;
    captureBtn.textContent = 'Analyze My Skin';
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(function(t) { t.stop(); });
      stream = null;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  window.addEventListener('beforeunload', stopCamera);

  console.log('[AI Skin Analysis] Script loaded');
})();
