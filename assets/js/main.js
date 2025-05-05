/**
 * Main JavaScript file for Vina Raja's Portfolio
 */

document.addEventListener('DOMContentLoaded', function() {
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      });
      
      // Mobile menu toggle
      const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
      const navLinks = document.querySelector('.nav-links');
      
      if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
          navLinks.classList.toggle('active');
          const icon = mobileMenuBtn.querySelector('i');
          
          if (icon) {
            if (navLinks.classList.contains('active')) {
              icon.classList.remove('fa-bars');
              icon.classList.add('fa-times');
            } else {
              icon.classList.remove('fa-times');
              icon.classList.add('fa-bars');
            }
          }
        });
      }
    }
    
    // Intersection Observer for animations
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    
    if (animateElements.length > 0) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      
      animateElements.forEach(el => {
        observer.observe(el);
      });
    }
    
    // Init Typed.js if element exists
    const typedElement = document.getElementById('typed-text');
    
    if (typedElement && typeof Typed !== 'undefined') {
      new Typed('#typed-text', {
        strings: [
          'Building the future, one project at a time.',
          'Front-end Developer',
          'UI/UX Enthusiast',
          'Creative Coder',
          '3D Web Developer'
        ],
        typeSpeed: 60,
        backSpeed: 40,
        backDelay: 2000,
        startDelay: 1000,
        loop: true,
        showCursor: true,
        cursorChar: '|'
      });
    }
    
    // Project filtering
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectItems = document.querySelectorAll('.project-item');
    
    if (filterBtns.length > 0 && projectItems.length > 0) {
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          // Update active button
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          const filter = btn.dataset.filter;
          
          // Filter projects
          projectItems.forEach(item => {
            if (filter === 'all' || item.dataset.category === filter) {
              item.style.display = 'block';
              setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
              }, 10);
            } else {
              item.style.opacity = '0';
              item.style.transform = 'translateY(20px)';
              setTimeout(() => {
                item.style.display = 'none';
              }, 300);
            }
          });
        });
      });
    }
    
    // Contact form handling
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
      contactForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const formStatus = document.getElementById('form-status');
        if (!formStatus) return;
        
        // Show sending status
        formStatus.textContent = "Sending message...";
        
        // Here you would typically send the form data to your backend
        // This is a simulation for demo purposes
        setTimeout(() => {
          formStatus.textContent = "Message sent successfully!";
          formStatus.style.color = "var(--color-primary)";
          contactForm.reset();
        }, 1500);
        
        // Uncomment and configure when ready to use a real email service
        /*
        if (typeof emailjs !== 'undefined') {
          // Get form data
          const templateParams = {
            from_name: document.getElementById('name').value,
            from_email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
          };
          
          // Send the form using EmailJS - Replace with your own credentials
          emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
            .then(function() {
              formStatus.textContent = "Message sent successfully!";
              formStatus.style.color = "var(--color-primary)";
              contactForm.reset();
            }, function(error) {
              formStatus.textContent = "Error sending message. Please try again later.";
              formStatus.style.color = "var(--color-accent)";
              console.error('EmailJS error:', error);
            });
        }
        */
      });
    }
    
    // Theme toggle (if you want to add a light/dark mode feature)
    const themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        
        // Save preference to localStorage
        if (document.body.classList.contains('light-theme')) {
          localStorage.setItem('theme', 'light');
        } else {
          localStorage.setItem('theme', 'dark');
        }
      });
      
      // Check for saved preference
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
      }
    }
    
    // Add smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 100, // Offset for fixed header
            behavior: 'smooth'
          });
        }
      });
    });
  });