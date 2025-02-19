document.addEventListener("DOMContentLoaded", function () {
    let typed = new Typed("#typed-text", {
        strings: ["My name is Vina Raja", "I am a Software Engineeer", "I am an aspiring AI Engineer","I love to paint", "I love to code", "I love to learn new things"],
        typeSpeed: 50,
        backSpeed: 30,
        loop: true
    });

    VANTA.WAVES({
        el: "#vanta-bg",
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        color:  0x0// Adjust this color as needed
    });
});s