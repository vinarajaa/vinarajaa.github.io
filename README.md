
# Modern Portfolio Website

A clean, responsive portfolio website built with HTML, CSS, and JavaScript. This portfolio includes a standard website layout as well as an interactive 3D experience powered by Three.js.

## Features

- **Responsive Design**: Works on all device sizes
- **Modern Aesthetics**: Clean, professional design with subtle animations
- **Interactive 3D Experience**: WebGL-powered 3D showcase (inspired by Bruno Simon)
- **Project Showcase**: Filterable project grid
- **Contact Form**: Ready to integrate with EmailJS
- **Easy to Customize**: Well-organized code with CSS variables

## Pages

1. **Home Page** (`index.html`): Introduction and featured projects
2. **About Page** (`about.html`): Bio, skills, experience, and education
3. **Projects Page** (`projects.html`): Filterable project portfolio
4. **Contact Page** (`contact.html`): Contact form and information
5. **3D Experience** (`3d-experience.html`): Interactive WebGL portfolio experience

## Setup Instructions

1. **Clone or download** this repository to your local machine
2. **Open the files** in your preferred code editor
3. **Customize the content** to match your personal information and projects
4. **Deploy** to your preferred hosting service (GitHub Pages, Netlify, Vercel, etc.)

## Customization Guide

### Personal Information

Update the following files to customize your personal information:

- **All HTML files**: Update name and page titles
- **index.html**: Update introduction and skills
- **about.html**: Update bio, skills, experience, and education
- **contact.html**: Update contact information and social links

### Projects

In the `projects.html` file:

1. Find the `project-grid` section
2. Update or add new project items following the existing structure
3. Update project images, titles, descriptions, and links
4. Add appropriate category tags for filtering

### Styling

The main styling is controlled by CSS variables in the `:root` section of `assets/css/style.css`. You can easily change:

- **Color Scheme**: Update the color variables
- **Typography**: Change fonts and sizes
- **Spacing**: Adjust spacing variables
- **Animations**: Modify transitions and animations

```css
:root {
  /* Color Scheme */
  --color-background: #0a0a0a;
  --color-text: #f8f8f8;
  --color-primary: #64ffda;
  --color-secondary: #c792ea;
  --color-accent: #ff5555;
  /* ... more variables ... */
}
```

### 3D Experience

To customize the 3D experience in `3d-experience.html`:

1. Update the 3D objects and their positions
2. Change colors and materials to match your branding
3. Add or modify interactive elements
4. Update the lighting and environment

## Setting Up the Contact Form

The contact form is pre-configured to work with EmailJS. To set it up:

1. Create an account at [EmailJS](https://www.emailjs.com/)
2. Create an email template
3. Get your user ID, service ID, and template ID
4. Update the EmailJS configuration in `assets/js/contact.js`
5. Uncomment the EmailJS code

## Dependencies

- [Font Awesome](https://fontawesome.com/) - Icons
- [Typed.js](https://github.com/mattboldt/typed.js/) - Text typing animation
- [Three.js](https://threejs.org/) - 3D rendering (for the 3D experience page)
- [EmailJS](https://www.emailjs.com/) - Contact form handling (optional)

## Browser Support

This portfolio is compatible with modern browsers including:
- Chrome
- Firefox
- Safari
- Edge

## License

Feel free to use this template for your personal portfolio. Attribution is appreciated but not required.

## Credits

- 3D Experience inspired by [Bruno Simon's portfolio](https://bruno-simon.com/)
- Font: Fira Code by Mozilla
- Icons: Font Awesome

---

## Need Help?

If you need assistance with customizing this template or have questions about implementation, feel free to:

1. Check the code comments for guidance
2. Look for similar patterns in the existing code
3. Consult the documentation for the libraries used

---

Happy coding!