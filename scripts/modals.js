// Modal management module
import { showScreen } from './screens.js';
import { resetTimer } from './timer.js';

// Cancel confirmation modal functions
export function showCancelConfirmation() {
  const modal = document.getElementById('cancelModal');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

export function hideCancelConfirmation() {
  const modal = document.getElementById('cancelModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

export function confirmCancel() {
  hideCancelConfirmation();
  
  setTimeout(() => {
    resetTimer();
    
    if (window.resetWaypoints) {
      window.resetWaypoints();
    }
    
    if (window.resetCurrentWaypointIndex) {
      window.resetCurrentWaypointIndex();
    }
    
    document.querySelectorAll('input[name="time"]').forEach((radio) => (radio.checked = false));
    document.querySelectorAll('input[name="difficulty"]').forEach((radio) => (radio.checked = false));
    
    showScreen("start-screen");
    if (window.updateStartButtonState) {
      window.updateStartButtonState();
    }
  }, 300);
}

// Location error modal functions
export function showLocationErrorModal(message, showRetry = false, isPermissionDenied = false) {
  // Remove any existing error modal
  const existingModal = document.getElementById('locationErrorModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Format message for multi-line display
  const formattedMessage = message.replace(/\n/g, '<br>');
  
  // Different button text and action based on error type
  const retryButtonText = isPermissionDenied ? "Tillbaka till start" : "Försök igen";
  const retryFunction = isPermissionDenied ? "goBackToStart" : "retryLocationAccess";
  
  // Create modal HTML
  const modalHTML = `
    <div id="locationErrorModal" class="modal-overlay">
      <div class="modal" style="height: auto; min-height: 11.6875rem; padding: 20px;">
        <div class="modal-message">
          <h2 style="color: var(--warning); margin-bottom: 1rem;">Platsfel</h2>
          <div style="text-align: center; white-space: pre-line; line-height: 1.4;">${formattedMessage}</div>
        </div>
        <div class="modal-actions" style="margin-top: 20px;">
          ${showRetry ? `<button class="modal-btn modal-btn-confirm" onclick="${retryFunction}()">${retryButtonText}</button>` : ''}
        </div>
      </div>
    </div>
  `;
  
  // Add modal to DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Show modal
  setTimeout(() => {
    const modal = document.getElementById('locationErrorModal');
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }, 100);
}

export function hideLocationErrorModal() {
  const modal = document.getElementById('locationErrorModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Initialize modal event listeners
export function initializeModalEventListeners() {
  // Cancel modal event listeners
  document.querySelectorAll(".cancel-link").forEach(function(cancelLink) {
    cancelLink.addEventListener("click", function(e) {
      e.preventDefault();
      showCancelConfirmation();
    });
  });

  // Close modal when clicking outside
  const cancelModal = document.getElementById('cancelModal');
  if (cancelModal) {
    cancelModal.addEventListener('click', function(e) {
      if (e.target === this) {
        hideCancelConfirmation();
      }
    });
  }

  // Prevent modal from closing when clicking inside
  const modal = document.querySelector('.modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }

  // Keyboard support for modals
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const cancelModal = document.getElementById('cancelModal');
      if (cancelModal && cancelModal.classList.contains('show')) {
        hideCancelConfirmation();
      }
      
      const locationModal = document.getElementById('locationErrorModal');
      if (locationModal && locationModal.classList.contains('show')) {
        hideLocationErrorModal();
      }
    }
  });
}

// Make functions available globally for onclick handlers
window.showCancelConfirmation = showCancelConfirmation;
window.hideCancelConfirmation = hideCancelConfirmation;
window.confirmCancel = confirmCancel;