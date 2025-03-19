// assets/js/script.js

// Dark Mode Toggle (optional - add button if desired)
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
    });
}

// Scroll Fade-In Sections
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

// Smart Typed Text Effect
const typedOutput = document.getElementById('typed-output');
const cursor = document.querySelector('.cursor');

// Word groups: [prefix, variable part]
const lines = [
    ["My name is ", "Vina Raja."],
    ["I am a ", "programmer."],
    ["I am a ", "painter."],
    ["I am a ", "designer."],
    ["I am a ", "student."],
    ["", "Explore around, glad you're here!"]
];

let lineIndex = 0;
let charIndex = 0;
let isDeleting = false;
let prefix = "";
let variablePart = "";

function typeSmart() {
    const [currentPrefix, currentVariable] = lines[lineIndex];

    if (prefix !== currentPrefix) {
        // Switching to a new prefix – type from start
        prefix = currentPrefix;
        variablePart = "";
        charIndex = 0;
        typedOutput.textContent = prefix;
    }

    const fullText = prefix + currentVariable;
    const visibleText = prefix + variablePart;
    typedOutput.textContent = visibleText;

    if (!isDeleting && charIndex < currentVariable.length) {
        variablePart += currentVariable.charAt(charIndex);
        charIndex++;
        setTimeout(typeSmart, 70);
    } else if (isDeleting && charIndex > 0) {
        variablePart = variablePart.substring(0, charIndex - 1);
        charIndex--;
        setTimeout(typeSmart, 40);
    } else {
        if (!isDeleting) {
            setTimeout(() => {
                isDeleting = true;
                typeSmart();
            }, 1200);
        } else {
            isDeleting = false;
            lineIndex = (lineIndex + 1) % lines.length;
            prefix = "";
            variablePart = "";
            charIndex = 0;
            setTimeout(typeSmart, 300);
        }
    }
}

document.addEventListener('DOMContentLoaded', typeSmart);