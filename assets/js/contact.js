// Initialize EmailJS
(function() {
    emailjs.init("vina.k.raja@gmail.com"); // Replace with your EmailJS User ID
})();

document.getElementById("contact-form").addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const message = document.getElementById("message").value.trim();
    const formStatus = document.getElementById("form-status");

    if (!name || !email || !message) {
        formStatus.textContent = "Please fill in all required fields.";
        return;
    }

    emailjs.send("service_o7204i9", "template_ltjguff", {
        from_name: name,
        from_email: email,
        subject: subject,
        message: message
    })
    .then(function(response) {
        formStatus.textContent = "Message sent successfully! 🚀";
        document.getElementById("contact-form").reset();
    }, function(error) {
        formStatus.textContent = "Failed to send message. Please try again.";
        console.error("EmailJS Error:", error);
    });
});