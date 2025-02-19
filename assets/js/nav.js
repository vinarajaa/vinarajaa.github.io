document.addEventListener("DOMContentLoaded", function() {
    const currentPage = window.location.pathname.split("/").pop();

    // Only add Home button if not on index.html or root
    if (currentPage !== "index.html" && currentPage !== "") {
        const heroButtons = document.querySelector('.hero-buttons');

        // Create the Home Button
        const homeButton = document.createElement('a');
        homeButton.href = "index.html";
        homeButton.classList.add("glow-on-hover", "home-btn");
        homeButton.innerHTML = `<i class="fas fa-home"></i><span class="btn-text">Home</span>`;

        // Prepend Home button to the navigation
        heroButtons.prepend(homeButton);
    }
});