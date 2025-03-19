document.addEventListener("DOMContentLoaded", function () {
    let typed = new Typed("#typed-text", {
        strings: [
            "My name is Vina Raja.",
            "I am a programmer.",
            "I am a painter.",
            "I am a designer.",
            "I am a student.",
            "Explore around, glad you're here!"
        ],
        typeSpeed: 40,
        backSpeed: 25,
        startDelay: 500,
        backDelay: 1200,
        loop: true,
        showCursor: true,
        cursorChar: '|',
    });
});