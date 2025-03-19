// assets/js/script.js

// Dark Mode Toggle (optional - add button if desired)
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
    });
}

// Scroll Fade-In Trigger
const fadeElements = document.querySelectorAll('.fade-in-scroll');

const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
}, observerOptions);

fadeElements.forEach(el => observer.observe(el));

const typedOutput = document.getElementById('typed-output');

const lines = [
    ["My name is ", "Vina Raja."],
    ["I am a ", "programmer."],
    ["I am a ", "painter."],
    ["I am a ", "designer."],
    ["I am a ", "student."],
    ["", "Explore around, glad you're here!"]
];

let currentLine = 0;
let currentText = "";
let isTyping = true;
let prefix = "";
let suffix = "";

function typeLine() {
    const [nextPrefix, nextSuffix] = lines[currentLine];

    // If prefix changed, reset everything
    if (prefix !== nextPrefix) {
        prefix = nextPrefix;
        suffix = "";
        currentText = "";
        typedOutput.textContent = prefix;
    }

    // If typing
    if (isTyping) {
        if (suffix.length < nextSuffix.length) {
            suffix += nextSuffix.charAt(suffix.length);
            typedOutput.textContent = prefix + suffix;
            setTimeout(typeLine, 70);
        } else {
            isTyping = false;
            setTimeout(typeLine, 1500); // Pause before deleting
        }
    } else {
        if (suffix.length > 0) {
            suffix = suffix.substring(0, suffix.length - 1);
            typedOutput.textContent = prefix + suffix;
            setTimeout(typeLine, 40);
        } else {
            // Move to next line
            currentLine = (currentLine + 1) % lines.length;
            isTyping = true;
            setTimeout(typeLine, 300);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(typeLine, 500);
});

// Scroll Fade-In Trigger
document.addEventListener('DOMContentLoaded', () => {
    const fadeElements = document.querySelectorAll('.fade-in-scroll');

    const observerOptions = {
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target); // trigger once
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => observer.observe(el));
});