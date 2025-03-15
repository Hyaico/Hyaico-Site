// Particle animation
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Create particle class
class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 5 + 2; // Larger particles
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.color = `rgba(80, 80, 80, ${Math.random() * 0.4 + 0.3})`; // Darker and more visible
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce off edges
        if (this.x > canvas.width || this.x < 0) {
            this.speedX = -this.speedX;
        }
        if (this.y > canvas.height || this.y < 0) {
            this.speedY = -this.speedY;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Connect particles with lines
function connectParticles() {
    const maxDistance = 200;
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < maxDistance) {
                const opacity = 1 - distance / maxDistance;
                ctx.strokeStyle = `rgba(100, 100, 100, ${opacity * 0.35})`; // More visible lines
                ctx.lineWidth = 1.5; // Slightly thicker lines
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
}

// Initialize particles
function init() {
    particles = [];
    const particleCount = Math.min(120, Math.floor((window.innerWidth * window.innerHeight) / 8000)); // More particles
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

// Animate particles
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });
    connectParticles();
    requestAnimationFrame(animate);
}

// Initialize everything when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize GSAP
    gsap.registerPlugin(ScrollTrigger);

    // Create master timeline
    const masterTl = gsap.timeline();

    // Initialize and fade in particles
    resizeCanvas();
    init();
    animate();
    
    // Fade in the canvas
    gsap.to(canvas, {
        opacity: 1,
        duration: 1.5,
        ease: "power2.inOut"
    });

    // Rest of your animation code...
    // Word reveal animation
    const words = document.querySelectorAll('.word-reveal');
    words.forEach((word, index) => {
        masterTl.fromTo(word, 
            { 
                opacity: 0, 
                y: 30,
                scale: 0.95,
                rotationX: -20
            },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                rotationX: 0,
                duration: 1.2,
                ease: "power4.out"
            },
            index * 0.12
        );
    });

    // Paragraph reveal
    masterTl.fromTo('.reveal-text',
        { 
            opacity: 0, 
            y: 20,
            scale: 0.98
        },
        {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.4,
            ease: "power3.out"
        },
        "-=0.8"
    );

    // Button reveal with smoother end
    masterTl.fromTo('.reveal-button',
        { 
            opacity: 0, 
            y: 20,
            scale: 0.95
        },
        {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: "power2.out",
        },
        "-=0.8"
    );

    // Button hover animations with smoother transitions
    const button = document.querySelector('.reveal-button');
    let buttonHoverTl;
    
    button.addEventListener('mouseenter', function() {
        if (buttonHoverTl) buttonHoverTl.kill();
        buttonHoverTl = gsap.timeline()
            .to(this, {
                scale: 1.03,
                y: -1,
                backgroundColor: '#1a1a1a',
                duration: 0.25,
                ease: "power1.out"
            });
    });

    button.addEventListener('mouseleave', function() {
        if (buttonHoverTl) buttonHoverTl.kill();
        buttonHoverTl = gsap.timeline()
            .to(this, {
                scale: 1,
                y: 0,
                backgroundColor: '#000000',
                duration: 0.25,
                ease: "power1.inOut"
            });
    });
});

// Handle window resize
window.addEventListener('resize', () => {
    resizeCanvas();
    init();
});

// Header scroll behavior
const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        header.classList.add('header-scrolled');
    } else {
        header.classList.remove('header-scrolled');
    }
    
    lastScroll = currentScroll;
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
}); 