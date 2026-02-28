// Particle animation
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];
let animateFrameId; // Add this to track the animation frame

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
        this.color = `rgba(100, 116, 139, ${Math.random() * 0.4 + 0.2})`; // Slate-500 for white background
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
                ctx.strokeStyle = `rgba(148, 163, 184, ${opacity * 0.3})`; // Slate-400 for white background
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
    animateFrameId = requestAnimationFrame(animate);
}

// Initialize everything when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize GSAP
    gsap.registerPlugin(ScrollTrigger);

    // Create master timeline
    const masterTl = gsap.timeline();

    // Setup cursor-based particle interaction
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Setup interactive scroll-based effect for hero section
    let targetScrollY = 0;
    let currentScrollY = 0;
    const heroSection = document.getElementById('hero');
    
    // Listen for wheel events to create an artificial scroll effect on hero text
    window.addEventListener('wheel', (e) => {
        // Clamp the scroll value so it doesn't get too extreme
        targetScrollY += e.deltaY * 0.1;
        if (targetScrollY > 30) targetScrollY = 30;
        if (targetScrollY < -30) targetScrollY = -30;
    }, { passive: true });
    
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Enhance animate function to include mouse repulsion and hero tilt
    const originalAnimate = animate;
    animate = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Smooth out the artificial scroll value for hero tilt
        currentScrollY += (targetScrollY - currentScrollY) * 0.1;
        // Slowly return scroll to neutral when not actively scrolling
        targetScrollY *= 0.95;
        
        // Apply 3D tilt effect to hero section based on scroll wheel
        if (heroSection) {
            heroSection.style.transform = `perspective(1000px) rotateX(${currentScrollY * -1}deg) translateY(${currentScrollY * -2}px)`;
        }
        
        particles.forEach(particle => {
            // Calculate distance to mouse
            const dx = mouseX - particle.x;
            const dy = mouseY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Mouse repulsion effect
            const maxDistance = 150;
            if (distance < maxDistance) {
                const force = (maxDistance - distance) / maxDistance;
                particle.x -= (dx / distance) * force * 2;
                particle.y -= (dy / distance) * force * 2;
            }
            
            // Subtle ambient movement
            particle.x += Math.sin(Date.now() * 0.001 + particle.y * 0.01) * 0.2;
            particle.y += Math.cos(Date.now() * 0.001 + particle.x * 0.01) * 0.2;
            
            particle.update();
            particle.draw();
        });
        
        connectParticles();
        animateFrameId = requestAnimationFrame(animate);
    };

    // Initialize and fade in particles
    // Prevent duplicate animation loops by clearing old ones
    if (animateFrameId) {
        cancelAnimationFrame(animateFrameId);
    }
    
    resizeCanvas();
    init();
    animate();
    
    // Remove scroll-based particle interaction since page won't scroll
    // Only keeping ambient floating and mouse interaction

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
    
    if (button) {
        button.addEventListener('mouseenter', function() {
            if (buttonHoverTl) buttonHoverTl.kill();
            buttonHoverTl = gsap.timeline()
                .to(this, {
                    scale: 1.05,
                    y: -2,
                    backgroundColor: '#1f2937', // gray-800
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                    duration: 0.3,
                    ease: "power2.out"
                });
        });

        button.addEventListener('mouseleave', function() {
            if (buttonHoverTl) buttonHoverTl.kill();
            buttonHoverTl = gsap.timeline()
                .to(this, {
                    scale: 1,
                    y: 0,
                    backgroundColor: '#111827', // gray-900
                    boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.1)',
                    duration: 0.3,
                    ease: "power2.inOut"
                });
        });
    }
});

// Modal functions
function openAppsModal() {
    const modal = document.getElementById('appsModal');
    
    // Make modal interactive
    modal.classList.remove('pointer-events-none');
    
    // Animate backdrop
    gsap.to(modal.querySelector('.modal-backdrop'), {
        opacity: 1,
        duration: 0.4,
        ease: "power2.out"
    });
    
    // Animate content container
    gsap.fromTo(modal.querySelector('.modal-content'), 
        { scale: 0.95, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.5)", delay: 0.1 }
    );
    
    // Stagger in the items inside the modal
    gsap.fromTo(modal.querySelectorAll('.group'),
        { opacity: 0, x: -10, y: 10 },
        { opacity: 1, x: 0, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out", delay: 0.3 }
    );
}

function closeAppsModal() {
    const modal = document.getElementById('appsModal');
    
    // Make modal non-interactive immediately
    modal.classList.add('pointer-events-none');
    
    // Animate content out
    gsap.to(modal.querySelector('.modal-content'), {
        scale: 0.95,
        opacity: 0,
        y: 10,
        duration: 0.3,
        ease: "power2.in"
    });
    
    // Animate backdrop out
    gsap.to(modal.querySelector('.modal-backdrop'), {
        opacity: 0,
        duration: 0.4,
        delay: 0.1,
        ease: "power2.in"
    });
}

// Handle Escape key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('appsModal');
        if (!modal.classList.contains('pointer-events-none')) {
            closeAppsModal();
        }
    }
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