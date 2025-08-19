// Screen navigation functions
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

document.getElementById('create-route-btn').addEventListener('click', function() {
    const selectedTime = document.querySelector('input[name="time"]:checked');
    const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked');
    
    if (!selectedTime || !selectedDifficulty) {
        alert('Vänligen välj både tid och svårighetsgrad!');
        return;
    }
    
    showScreen('map-screen');
});

document.getElementById('arrived-btn').addEventListener('click', function() {
    showScreen('challenge-screen');
});

document.getElementById('done-btn').addEventListener('click', function() {
    showScreen('final-screen');
});

document.getElementById('home-btn').addEventListener('click', function() {
    document.querySelectorAll('input[name="time"]').forEach(radio => radio.checked = false);
    document.querySelectorAll('input[name="difficulty"]').forEach(radio => radio.checked = false);
    
    showScreen('start-screen');
});