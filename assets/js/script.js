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

const canvas = document.getElementById("tube-canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

const tubes = [];
const tubeCount = 20;

for (let i = 0; i < tubeCount; i++) {
    tubes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        radius: Math.random() * 80 + 40
    });
}

function drawTubes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    tubes.forEach(tube => {
        ctx.beginPath();
        ctx.arc(tube.x, tube.y, tube.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100, 255, 218, 0.5)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        tube.x += tube.speedX;
        tube.y += tube.speedY;

        if (tube.x < 0 || tube.x > canvas.width) tube.speedX *= -1;
        if (tube.y < 0 || tube.y > canvas.height) tube.speedY *= -1;
    });

    requestAnimationFrame(drawTubes);
}

drawTubes();