document.addEventListener("DOMContentLoaded", function () {
    let typed = new Typed("#typed-text", {
        strings: ["a Web Developer", "a Tech Enthusiast", "a Problem Solver"],
        typeSpeed: 50,
        backSpeed: 30,
        loop: true
    });

    // Ensure Particles.js is loaded before calling it
    if (typeof particlesJS !== "undefined") {
        particlesJS("particles-js", {
            particles: {
                number: { value: 100 },
                size: { value: 3 },
                move: { speed: 1 },
                line_linked: { enable: true, color: "#64ffda" }
            }
        });
    } else {
        console.error("Particles.js failed to load.");
    }
});

const canvas = document.getElementById("tile-canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawTiles();
});

const tileSize = 50;
const tiles = [];

for (let y = 0; y < canvas.height; y += tileSize) {
    for (let x = 0; x < canvas.width; x += tileSize) {
        tiles.push({ x, y, color: getRandomColor() });
    }
}

function getRandomColor() {
    const colors = ["#64ffda", "#06beb6", "#1a2a6c", "#b21f1f"];
    return colors[Math.floor(Math.random() * colors.length)];
}

function drawTiles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tiles.forEach(tile => {
        ctx.fillStyle = tile.color;
        ctx.fillRect(tile.x, tile.y, tileSize, tileSize);
    });
}

function animateTiles() {
    tiles.forEach(tile => {
        tile.color = getRandomColor();
    });
    drawTiles();
    setTimeout(animateTiles, 1000); // Change color every second
}

drawTiles();
animateTiles();