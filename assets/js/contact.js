

// assets/js/contact.js

// Initialize EmailJS
emailjs.init("atlYg7uADZLkw_giM"); // Replace with your EmailJS User ID

document.getElementById('contact-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const status = document.getElementById('form-status');

    emailjs.send("service_o7204i9", "template_ltjguff", {
        from_name: document.getElementById("name").value,
        from_email: document.getElementById("email").value,
        subject: document.getElementById("subject").value,
        message: document.getElementById("message").value
    }).then(() => {
        status.textContent = "Message sent successfully!";
        status.style.color = "green";
        this.reset();
    }).catch(() => {
        status.textContent = "Failed to send message. Try again later.";
        status.style.color = "red";
    });
});
