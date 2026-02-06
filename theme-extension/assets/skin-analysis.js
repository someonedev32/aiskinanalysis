/**
 * AI Skin Analysis - Theme App Extension JavaScript
 * Handles camera capture and skin analysis via App Proxy
 * 
 * No images are stored - analysis is performed in real-time only.
 */

(function() {
  'use strict';

  const wrapper = document.getElementById('lumina-skin-analysis');
  if (!wrapper) return;

  const PROXY_URL = wrapper.dataset.appProxyUrl;
  const SHOP = wrapper.dataset.shop;

  let videoStream = null;

  // Elements
  const video = document.getElementById('lumina-video');
  const canvas = document.getElementById('lumina-canvas');
  const placeholder = document.getElementById('lumina-placeholder');
  const scanOverlay = document.getElementById('lumina-scan-overlay');
  const startBtn = document.getElementById('lumina-start-btn');
  const captureBtn = document.getElementById('lumina-capture-btn');
  const retryBtn = document.getElementById('lumina-retry-btn');
  const loadingEl = document.getElementById('lumina-loading');
  const resultsEl = document.getElementById('lumina-results');
  const cameraSection = document.getElementById('lumina-camera-section');

  // Start Camera
  window.luminaStartCamera = async function() {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }
      });
      video.srcObject = videoStream;
      video.style.display = 'block';
      placeholder.style.display = 'none';
      startBtn.style.display = 'none';
      captureBtn.style.display = 'inline-flex';
    } catch (err) {
      console.error('Camera access denied:', err);
      placeholder.innerHTML = '<p style="color: #991B1B;">Camera access denied. Please allow camera permissions and try again.</p>';
    }
  };

  // Capture Snapshot
  window.luminaCapture = async function() {
    if (!video.srcObject) return;

    // Show scan animation
    scanOverlay.style.display = 'block';
    captureBtn.style.display = 'none';

    // Capture frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Convert to base64 (JPEG for smaller size)
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

    // Stop camera
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }

    // Show loading
    setTimeout(() => {
      scanOverlay.style.display = 'none';
      cameraSection.style.display = 'none';
      loadingEl.style.display = 'flex';
    }, 1500);

    // Send to backend via App Proxy
    try {
      const response = await fetch(`${PROXY_URL}/analyze?shop=${SHOP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Analysis failed');
      }

      const data = await response.json();
      displayResults(data.result);

    } catch (err) {
      console.error('Analysis error:', err);
      loadingEl.style.display = 'none';
      cameraSection.style.display = 'block';
      retryBtn.style.display = 'inline-flex';
      alert('Analysis failed: ' + err.message);
    }
  };

  // Retry
  window.luminaRetry = function() {
    retryBtn.style.display = 'none';
    resultsEl.style.display = 'none';
    cameraSection.style.display = 'block';
    startBtn.style.display = 'inline-flex';
    placeholder.style.display = 'flex';
    video.style.display = 'none';
  };

  // Display Results
  function displayResults(result) {
    loadingEl.style.display = 'none';
    resultsEl.style.display = 'block';
    retryBtn.style.display = 'inline-flex';
    cameraSection.style.display = 'block';
    startBtn.style.display = 'none';
    captureBtn.style.display = 'none';

    // Score
    const scoreEl = document.getElementById('lumina-score');
    const scoreColor = result.score >= 70 ? '#3F6212' : result.score >= 40 ? '#854D0E' : '#991B1B';
    scoreEl.innerHTML = `
      <div style="font-size: 3rem; font-weight: 700; color: ${scoreColor}; line-height: 1;">${result.score}</div>
      <div style="font-size: 0.75rem; color: #A1A1AA;">out of 100</div>
    `;

    // Skin Type
    document.getElementById('lumina-skin-type').innerHTML = `
      <h4>Skin Type</h4>
      <span class="lumina-badge">${result.skin_type}</span>
      <span class="lumina-severity lumina-severity-${result.severity?.toLowerCase()}">${result.severity}</span>
    `;

    // Concerns
    const concernsHtml = (result.concerns || []).map(c => `<span class="lumina-tag">${c}</span>`).join('');
    document.getElementById('lumina-concerns').innerHTML = `
      <h4>Concerns Identified</h4>
      <div class="lumina-tags">${concernsHtml}</div>
    `;

    // Ingredients
    const ingredientsHtml = (result.ingredient_recommendations || []).map(i => `
      <div class="lumina-ingredient">
        <strong>${i.name}</strong>
        <span>${i.benefit}</span>
      </div>
    `).join('');
    document.getElementById('lumina-ingredients').innerHTML = `
      <h4>Recommended Ingredients</h4>
      ${ingredientsHtml}
    `;

    // AM Routine
    const amHtml = (result.am_routine || []).map(s => `
      <div class="lumina-step">
        <div class="lumina-step-num">${s.step}</div>
        <div><strong>${s.product_type}</strong><br><span>${s.description}</span></div>
      </div>
    `).join('');
    document.getElementById('lumina-am-routine').innerHTML = `
      <h4>Morning Routine (AM)</h4>
      ${amHtml}
    `;

    // PM Routine
    const pmHtml = (result.pm_routine || []).map(s => `
      <div class="lumina-step">
        <div class="lumina-step-num">${s.step}</div>
        <div><strong>${s.product_type}</strong><br><span>${s.description}</span></div>
      </div>
    `).join('');
    document.getElementById('lumina-pm-routine').innerHTML = `
      <h4>Evening Routine (PM)</h4>
      ${pmHtml}
    `;

    // Summary
    document.getElementById('lumina-summary').innerHTML = `
      <p>${result.summary}</p>
    `;
  }

})();
