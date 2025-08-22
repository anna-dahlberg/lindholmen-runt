// Timer functionality module
let startTime = null;
let timerInterval = null;
let isTimerRunning = false;

export function startTimer() {
  if (!isTimerRunning) {
    startTime = Date.now();
    isTimerRunning = true;
    timerInterval = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay(); // Update immediately
  }
}

export function stopTimer() {
  if (isTimerRunning) {
    isTimerRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
}

export function resetTimer() {
  stopTimer();
  startTime = null;
  updateTimerDisplay();
}

export function updateTimerDisplay() {
  const timerElement = document.querySelector('.timer');
  if (timerElement) {
    const formattedTime = getFormattedTime();
    timerElement.textContent = formattedTime;
  }

  const challengeTimerElement = document.querySelector('.challenge-timer');
  if (challengeTimerElement) {
    const formattedTime = getFormattedTime();
    challengeTimerElement.textContent = formattedTime;
  }
}

export function getFormattedTime() {
  if (!startTime) {
    return '00:00';
  }

  const elapsed = isTimerRunning ? Date.now() - startTime : 0;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function getElapsedTime() {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}