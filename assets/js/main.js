/**
 * Main JavaScript file for Vina Raja's Portfolio
 */

// DOM Elements
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.header__links');
const dropdown = document.querySelector('.dropdown');
const dropdownLabel = document.querySelector('.dropdown__label');
const dropdownOptions = document.querySelectorAll('.dropdown__option');

// Page title animation
const steps = "/-\\|";
const FPS = 2;
const frameInterval = 1000 / FPS;

let step = 0;
let lastTimestep = 0;

// Function to animate the page title
function animateTitle() {
    const pathName = document.querySelector('.path__name')?.textContent || 
                      (window.location.pathname === '/' ? 'home' : 'portfolio');
    
    requestAnimationFrame(function animation(timestamp) {
        if (lastTimestep + frameInterval < timestamp) {
            document.title = `${steps[step++]} Vina Raja | ${pathName}`;
            step %= steps.length;
            lastTimestep = timestamp;
        }
        
        requestAnimationFrame(animation);
    });
}

// Handle mobile menu
if (hamburger) {
    hamburger.addEventListener('change', function() {
        if (this.checked) {
            navLinks.style.transform = 'translateY(0)';
        } else {
            navLinks.style.transform = 'translateY(-100%)';
        }
    });
}

// Handle language selection
if (dropdownOptions) {
    // Set up initial language from localStorage or default to English
    const savedLocale = localStorage.getItem('locale') || 'en';
    
    // Update dropdown to show current language
    if (dropdownLabel) {
        dropdownLabel.textContent = savedLocale;
    }
    
    // Set up language switching
    dropdownOptions.forEach(option => {
        // Swap the label and option if this is the current language
        if (option.textContent === savedLocale && dropdownLabel) {
            // We'll swap on click instead of on page load to avoid issues
            option.dataset.currentLanguage = 'true';
        }
        
        // Handle click on language option
        option.addEventListener('click', () => {
            const newLocale = option.textContent;
            
            // Save the selection
            localStorage.setItem('locale', newLocale);
            
            // Reload the page to apply the language change
            window.location.reload();
        });
    });
}

// Start title animation
animateTitle();

// Highlight current navigation link
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.header__link');
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        
        // Handle root path specially
        if (currentPath === '/' && linkPath === '/') {
            link.classList.add('header__link_active');
        } 
        // For other paths
        else if (currentPath.includes(linkPath) && linkPath !== '/') {
            link.classList.add('header__link_active');
        }
    });
});

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Account for header height
                    behavior: 'smooth'
                });
                
                // Update URL but don't add to history
                history.replaceState(null, null, targetId);
            }
        });
    });
});

// Add animation to elements on scroll
document.addEventListener('DOMContentLoaded', function() {
    const animateElements = document.querySelectorAll('.project, .skill-block, .fact');
    
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    animateElements.forEach(element => {
        // Set initial styles for animation
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        observer.observe(element);
    });
});