// Screen management module

export function showScreen(screenId) {
  const screens = document.querySelectorAll(".screen");
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  document.getElementById(screenId).classList.add("active");
        
  if (screenId === "map-screen") {
    setTimeout(() => {
      if (window.updateMapInstruction) {
        window.updateMapInstruction();
      }
      if (window.map) {
        window.map.invalidateSize();
      }
    }, 100);
  }
}