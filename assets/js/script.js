document.addEventListener("DOMContentLoaded", function () {
    let typed = new Typed("#typed-text", {
        strings: ["My name is Vina Raja", "I am a Software Engineeer", "I am an aspiring AI Engineer","I love painting 🎨", "I love coding 👨‍💻", "I love learning new things📚", "Glad you're here!"],
        typeSpeed: 40,
        backSpeed: 30,
        startDelay: 500,     // Small delay before typing starts
        backDelay: 1250, 
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
});