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