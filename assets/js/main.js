/**
 * Main JavaScript file for Elias Portfolio
 * - GSAP animations
 * - Scroll effects
 * - Mobile menu handling
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize GSAP and ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);
    
    // Mobile menu functionality
    initMobileMenu();
    
    // Smooth scrolling for navigation links
    initSmoothScroll();
    
    // Page animations
    initAnimations();
    
    // Scroll-triggered animations
    initScrollAnimations();
  });
  
  /**
   * Initialize mobile menu functionality
   */
  function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const hamburger = document.querySelector('.hamburger');
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
    
    if (!menuToggle || !mobileMenu) return;
    
    let isOpen = false;
    
    // Toggle menu function
    const toggleMenu = () => {
      isOpen = !isOpen;
      
      // Animate hamburger icon
      gsap.to(hamburger.querySelectorAll('span'), {
        duration: 0.3,
        backgroundColor: isOpen ? '#c778dd' : '#ffffff'
      });
      
      // First span animation (top)
      gsap.to(hamburger.querySelector('span:first-child'), {
        duration: 0.3,
        rotation: isOpen ? 45 : 0,
        y: isOpen ? 7 : 0
      });
      
      // Second span animation (bottom)
      gsap.to(hamburger.querySelector('span:last-child'), {
        duration: 0.3,
        rotation: isOpen ? -45 : 0,
        y: isOpen ? -7 : 0
      });
      
      // Animate mobile menu
      gsap.to(mobileMenu, {
        duration: 0.5,
        x: isOpen ? '0%' : '100%',
        ease: 'power3.inOut'
      });
      
      // Prevent scrolling when menu is open
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };
    
    // Event listeners
    menuToggle.addEventListener('click', toggleMenu);
    
    // Close menu when clicking on a link
    mobileMenuLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (isOpen) toggleMenu();
      });
    });
  }
  
  /**
   * Initialize smooth scrolling for navigation links
   */
  function initSmoothScroll() {
    const navLinks = document.querySelectorAll('.nav-link, .mobile-menu-link');
    
    navLinks.forEach(link => {
      link.addEventListener('click', e => {
        const targetId = link.getAttribute('href');
        
        // Only process internal links
        if (targetId.startsWith('#')) {
          e.preventDefault();
          const targetElement = document.querySelector(targetId);
          
          if (targetElement) {
            // Smooth scroll to the target
            window.scrollTo({
              top: targetElement.offsetTop - 80, // Account for fixed header
              behavior: 'smooth'
            });
          }
        }
      });
    });
  }
  
  /**
   * Initialize page animations
   */
  function initAnimations() {
    // Initial animations for hero section
    const heroTimeline = gsap.timeline();
    
    heroTimeline
      .from('.hero-title', {
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: 'power3.out'
      })
      .from('.hero-subtitle', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out'
      }, '-=0.4')
      .from('.hero-cta', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out'
      }, '-=0.4')
      .from('.hero-image', {
        opacity: 0,
        scale: 0.9,
        duration: 1,
        ease: 'power3.out'
      }, '-=0.6');
    
    // Marquee animation (continuous)
    gsap.to('.marquee-content', {
      xPercent: -50,
      repeat: -1,
      duration: 15,
      ease: 'linear'
    });
    
    // Navbar animation on scroll
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', () => {
      const nav = document.querySelector('.nav');
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (scrollTop > lastScrollTop) {
        // Scrolling down
        gsap.to(nav, {
          y: -80,
          duration: 0.3,
          ease: 'power3.out'
        });
      } else {
        // Scrolling up
        gsap.to(nav, {
          y: 0,
          duration: 0.3,
          ease: 'power3.out'
        });
      }
      
      // Add shadow when scrolled
      if (scrollTop > 50) {
        nav.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
      } else {
        nav.style.boxShadow = 'none';
      }
      
      lastScrollTop = scrollTop;
    });
  }
  
  /**
   * Initialize scroll-triggered animations
   */
  function initScrollAnimations() {
    // Section headers animation
    gsap.utils.toArray('.section-header').forEach(header => {
      gsap.from(header, {
        scrollTrigger: {
          trigger: header,
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: 'power3.out'
      });
    });
    
    // Projects animation
    gsap.utils.toArray('.project').forEach((project, index) => {
      gsap.from(project, {
        scrollTrigger: {
          trigger: project,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        delay: index * 0.2,
        ease: 'power3.out'
      });
    });
    
    // About section animation
    const aboutContent = document.querySelector('.about-content');
    if (aboutContent) {
      const aboutTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: aboutContent,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      });
      
      aboutTimeline
        .from('.about-image', {
          opacity: 0,
          x: -50,
          duration: 0.8,
          ease: 'power3.out'
        })
        .from('.about-text p', {
          opacity: 0,
          y: 30,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out'
        }, '-=0.4')
        .from('.about-text .btn', {
          opacity: 0,
          y: 20,
          duration: 0.6,
          ease: 'power3.out'
        }, '-=0.2');
    }
    
    // Skills animation
    const skillsContent = document.querySelector('.skills-content');
    if (skillsContent) {
      gsap.from('.skill-category', {
        scrollTrigger: {
          trigger: skillsContent,
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
      });
      
      gsap.from('.skill-item', {
        scrollTrigger: {
          trigger: skillsContent,
          start: 'top 70%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 20,
        duration: 0.6,
        stagger: 0.05,
        ease: 'power3.out'
      });
    }
    
    // Contact section animation
    const contactContent = document.querySelector('.contact-content');
    if (contactContent) {
      const contactTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: contactContent,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      });
      
      contactTimeline
        .from('.contact-info', {
          opacity: 0,
          x: -50,
          duration: 0.8,
          ease: 'power3.out'
        })
        .from('.contact-form', {
          opacity: 0,
          x: 50,
          duration: 0.8,
          ease: 'power3.out'
        }, '-=0.6')
        .from('.form-group', {
          opacity: 0,
          y: 20,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out'
        }, '-=0.4');
    }
    
    // Footer animation
    const footer = document.querySelector('.footer');
    if (footer) {
      gsap.from(footer, {
        scrollTrigger: {
          trigger: footer,
          start: 'top 90%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out'
      });
    }
  }