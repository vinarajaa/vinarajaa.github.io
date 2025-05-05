/**
 * Contact form handling for Vina Raja's Portfolio
 */

document.addEventListener('DOMContentLoaded', function() {
    // EmailJS initialization
    // Replace 'YOUR_USER_ID' with your actual EmailJS user ID when ready to implement
    // emailjs.init('YOUR_USER_ID');
    
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    
    if (contactForm && formStatus) {
      contactForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Validate inputs
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const message = document.getElementById('message').value.trim();
        
        if (!name || !email || !message) {
          formStatus.textContent = "Please fill in all required fields.";
          formStatus.style.color = "var(--color-accent)";
          return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          formStatus.textContent = "Please enter a valid email address.";
          formStatus.style.color = "var(--color-accent)";
          return;
        }
        
        // Show sending status
        formStatus.textContent = "Sending message...";
        formStatus.style.color = "var(--color-text)";
        
        // Simulation for demo purposes
        // Replace this with actual EmailJS implementation when ready
        setTimeout(() => {
          formStatus.textContent = "Message sent successfully!";
          formStatus.style.color = "var(--color-primary)";
          contactForm.reset();
        }, 1500);
        
        /* 
        // Uncomment and configure when ready to use EmailJS
        const templateParams = {
          from_name: name,
          from_email: email,
          subject: document.getElementById('subject').value,
          message: message
        };
        
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
        */
      });
    }
    
    // Reset form status when user starts typing again
    const formInputs = contactForm ? contactForm.querySelectorAll('input, textarea') : [];
    
    formInputs.forEach(input => {
      input.addEventListener('input', () => {
        if (formStatus.textContent !== "") {
          formStatus.textContent = "";
        }
      });
    });
  });