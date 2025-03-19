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

// Typed Text Effect
const typedOutput = document.getElementById('typed-output');
const words = [
    "My name is Vina Raja.",
    "I am a programmer.",
    "I am a painter.",
    "I am a designer.",
    "I am a student.",
    "Explore around, glad you're here!"
];

let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

function type() {
    const currentWord = words[wordIndex];
    const visibleText = currentWord.substring(0, charIndex);
    typedOutput.textContent = visibleText;

    if (!isDeleting && charIndex < currentWord.length) {
        charIndex++;
        setTimeout(type, 70);
    } else if (isDeleting && charIndex > 0) {
        charIndex--;
        setTimeout(type, 40);
    } else {
        if (!isDeleting) {
            setTimeout(() => {
                isDeleting = true;
                type();
            }, 1200); // Pause before delete
        } else {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            setTimeout(type, 300);
        }
    }
}

document.addEventListener('DOMContentLoaded', type);