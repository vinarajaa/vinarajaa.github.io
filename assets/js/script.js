document.addEventListener("DOMContentLoaded", function () {
    let typed = new Typed("#typed-text", {
        strings: ["a Web Developer", "a Tech Enthusiast", "a Problem Solver"],
        typeSpeed: 50,
        backSpeed: 30,
        loop: true
    });

    particlesJS("particles-js", {
        particles: {
            number: { value: 100 },
            size: { value: 3 },
            move: { speed: 1 },
            line_linked: { enable: true, color: "#64ffda" }
        }
    });
});