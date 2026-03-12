/**
 * Page Templates
 * Pre-designed page layouts for quick page creation
 */


// Blank template
export const blankTemplate = {
    content: [],
    root: { props: { backgroundColor: '#ffffff', maxWidth: '1200px' } },
    zones: {}
};

// Landing Page
export const landingPageTemplate = {
    content: [
        {
            type: 'Hero',
            props: {
                id: 'hero-landing',
                title: 'Transform Your Digital Presence',
                subtitle: 'Create stunning, high-performance websites with our intuitive visual builder. No coding required.',
                buttonText: 'Get Started Now',
                buttonLink: '#features',
                alignment: 'center',
                overlay: true,
                height: 'large',
                backgroundImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop'
            }
        },
        { type: 'Spacer', props: { id: 'spacer-1', height: 60 } },
        {
            type: 'Text',
            props: {
                id: 'text-features-head',
                content: '<h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem;">Why Choose Us?</h2><p style="text-align: center; color: #64748b; font-size: 1.125rem;">Everything you need to build a world-class website.</p>',
                alignment: 'center'
            }
        },
        { type: 'Spacer', props: { id: 'spacer-2', height: 40 } },
        {
            type: 'Grid',
            props: { id: 'grid-features', columns: 3, gap: 32 }
        },
        { type: 'Spacer', props: { id: 'spacer-3', height: 80 } },
        {
            type: 'Hero',
            props: {
                id: 'cta-section',
                title: 'Ready to Launch?',
                subtitle: 'Join thousands of satisfied customers building their future with us.',
                buttonText: 'Start Free Trial',
                buttonLink: '/signup',
                alignment: 'center',
                overlay: true,
                height: 'medium',
                backgroundImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop'
            }
        }
    ],
    root: { props: { backgroundColor: '#ffffff', maxWidth: '1200px' } },
    zones: {
        'grid-features:column-0': [
            {
                type: 'Feature',
                props: {
                    id: 'feat-1',
                    icon: 'zap',
                    title: 'Lightning Fast',
                    description: 'Optimized for speed. Your website will load in milliseconds, boosting SEO and user retention.',
                    iconColor: '#f59e0b'
                }
            }
        ],
        'grid-features:column-1': [
            {
                type: 'Feature',
                props: {
                    id: 'feat-2',
                    icon: 'shield',
                    title: 'Enterprise Security',
                    description: 'Bank-grade security features built-in. Data encryption, DDoS protection, and regular backups.',
                    iconColor: '#10b981'
                }
            }
        ],
        'grid-features:column-2': [
            {
                type: 'Feature',
                props: {
                    id: 'feat-3',
                    icon: 'layout',
                    title: 'Pixel Perfect',
                    description: 'Drag, drop, and customize every pixel. Complete design freedom without writing code.',
                    iconColor: '#6366f1'
                }
            }
        ]
    }
};

// About Page
export const aboutPageTemplate = {
    content: [
        {
            type: 'Hero',
            props: {
                id: 'hero-about',
                title: 'Our Story',
                subtitle: 'We are a passionate team dedicated to redefining the digital landscape.',
                alignment: 'center',
                height: 'medium',
                overlay: true,
                backgroundImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop'
            }
        },
        { type: 'Spacer', props: { id: 'sp-1', height: 60 } },
        {
            type: 'Grid',
            props: { id: 'grid-about-content', columns: 2, gap: 48 }
        },
        { type: 'Spacer', props: { id: 'sp-2', height: 60 } },
        {
            type: 'Text',
            props: {
                id: 'team-head',
                content: '<h2 style="text-align: center; margin-bottom: 1rem;">Meet the Team</h2><p style="text-align: center; color: #64748b;">The creative minds behind the magic.</p>',
                alignment: 'center'
            }
        },
        { type: 'Spacer', props: { id: 'sp-3', height: 40 } },
        {
            type: 'Grid',
            props: { id: 'grid-team', columns: 3, gap: 24 }
        }
    ],
    root: { props: { backgroundColor: '#ffffff', maxWidth: '1200px' } },
    zones: {
        'grid-about-content:column-0': [
            {
                type: 'Image',
                props: {
                    id: 'img-about',
                    src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=2070&auto=format&fit=crop',
                    alt: 'Our Office',
                    width: 'full',
                    borderRadius: 'lg'
                }
            }
        ],
        'grid-about-content:column-1': [
            {
                type: 'Text',
                props: {
                    id: 'text-about',
                    content: '<h3>Who We Are</h3><p>Founded in 2024, our company began with a simple idea: make professional web design accessible to everyone. We believe that technology should empower creativity, not hinder it.</p><p>Today, we serve global clients ranging from startups to Fortune 500 companies, providing tools that simplify complexity and amplify results.</p>',
                    alignment: 'left'
                }
            }
        ],
        'grid-team:column-0': [
            {
                type: 'Card',
                props: {
                    id: 'card-team-1',
                    title: 'Alex Morgan',
                    description: 'Chief Executive Officer',
                    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop',
                    variant: 'bordered'
                }
            }
        ],
        'grid-team:column-1': [
            {
                type: 'Card',
                props: {
                    id: 'card-team-2',
                    title: 'Sarah Chen',
                    description: 'Creative Director',
                    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop',
                    variant: 'bordered'
                }
            }
        ],
        'grid-team:column-2': [
            {
                type: 'Card',
                props: {
                    id: 'card-team-3',
                    title: 'Marcus Johnson',
                    description: 'Lead Developer',
                    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
                    variant: 'bordered'
                }
            }
        ]
    }
};

// Services Page
export const servicesPageTemplate = {
    content: [
        {
            type: 'Hero',
            props: {
                id: 'hero-services',
                title: 'Our Services',
                subtitle: 'We deliver comprehensive digital solutions to grow your business.',
                alignment: 'center',
                height: 'small',
                overlay: true,
                backgroundImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop'
            }
        },
        { type: 'Spacer', props: { id: 'sp-1', height: 60 } },
        {
            type: 'Grid',
            props: { id: 'grid-services', columns: 3, gap: 32 }
        },
        { type: 'Spacer', props: { id: 'sp-2', height: 60 } },
        {
            type: 'ContactForm',
            props: {
                id: 'contact-services',
                title: 'Start Your Project',
                subtitle: 'Get a free consultation today.',
                variant: 'card',
                buttonText: 'Request Quote'
            }
        }
    ],
    root: { props: { backgroundColor: '#f8fafc', maxWidth: '1200px' } },
    zones: {
        'grid-services:column-0': [
            {
                type: 'Card',
                props: {
                    id: 'svc-1',
                    title: 'Web Development',
                    description: 'Custom websites built with React, Next.js, and modern frameworks. Blazing fast and SEO optimized.',
                    variant: 'shadow',
                    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop'
                }
            },
            { type: 'Spacer', props: { id: 'sp-svc-1', height: 24 } },
            {
                type: 'Card',
                props: {
                    id: 'svc-4',
                    title: 'Cloud Solutions',
                    description: 'Secure and scalable cloud infrastructure setup and management on AWS, Google Cloud, or Azure.',
                    variant: 'shadow',
                    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop'
                }
            }
        ],
        'grid-services:column-1': [
            {
                type: 'Card',
                props: {
                    id: 'svc-2',
                    title: 'Mobile App Design',
                    description: 'User-centric mobile app designs for iOS and Android. Interface design that users love.',
                    variant: 'shadow',
                    image: 'https://images.unsplash.com/photo-1512941937669-90a1b5bbb695?q=80&w=2070&auto=format&fit=crop'
                }
            },
            { type: 'Spacer', props: { id: 'sp-svc-2', height: 24 } },
            {
                type: 'Card',
                props: {
                    id: 'svc-5',
                    title: 'Data Analytics',
                    description: 'Turn your data into actionable insights. Business intelligence dashboards and reporting.',
                    variant: 'shadow',
                    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'
                }
            }
        ],
        'grid-services:column-2': [
            {
                type: 'Card',
                props: {
                    id: 'svc-3',
                    title: 'Digital Marketing',
                    description: 'Strategic marketing campaigns to boost traffic and conversions. SEO, PPC, and Social Media.',
                    variant: 'shadow',
                    image: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?q=80&w=2076&auto=format&fit=crop'
                }
            },
            { type: 'Spacer', props: { id: 'sp-svc-3', height: 24 } },
            {
                type: 'Card',
                props: {
                    id: 'svc-6',
                    title: 'UI/UX Consulting',
                    description: 'Expert audit and consulting to improve your product\'s usability and customer satisfaction.',
                    variant: 'shadow',
                    image: 'https://images.unsplash.com/photo-1586717791821-3f44a5638d48?q=80&w=2070&auto=format&fit=crop'
                }
            }
        ]
    }
};

// Portfolio Template
export const portfolioPageTemplate = {
    content: [
        {
            type: 'Hero',
            props: {
                id: 'hero-portfolio',
                title: 'Featured Works',
                subtitle: 'A selection of projects that showcase our expertise.',
                alignment: 'center',
                height: 'small',
                overlay: true,
                backgroundImage: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2068&auto=format&fit=crop'
            }
        },
        { type: 'Spacer', props: { id: 'sp-1', height: 40 } },
        {
            type: 'Gallery',
            props: {
                id: 'gallery-main',
                columns: 3,
                gap: 16,
                aspectRatio: 'square',
                lightbox: true,
                borderRadius: 'lg',
                images: [
                    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop'
                ]
            }
        },
        { type: 'Spacer', props: { id: 'sp-2', height: 40 } },
        {
            type: 'Hero',
            props: {
                id: 'cta-portfolio',
                title: 'Have a project in mind?',
                subtitle: 'Let\'s collaborate and bring your vision to life.',
                buttonText: 'Contact Us',
                buttonLink: '/contact',
                height: 'small',
                overlay: true,
                backgroundImage: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop'
            }
        }
    ],
    root: { props: { backgroundColor: '#ffffff', maxWidth: '1200px' } },
    zones: {}
};

// Contact Page
export const contactPageTemplate = {
    content: [
        {
            type: 'Hero',
            props: {
                id: 'hero-contact',
                title: 'Contact Us',
                subtitle: 'We are here to answer any question you may have.',
                alignment: 'center',
                height: 'small',
                overlay: true,
                backgroundImage: 'https://images.unsplash.com/photo-1423666639041-f14d7045c573?q=80&w=2070&auto=format&fit=crop'
            }
        },
        { type: 'Spacer', props: { id: 'sp-1', height: 60 } },
        {
            type: 'Grid',
            props: { id: 'grid-contact', columns: 2, gap: 64 }
        }
    ],
    root: { props: { backgroundColor: '#ffffff', maxWidth: '1200px' } },
    zones: {
        'grid-contact:column-0': [
            {
                type: 'Text',
                props: {
                    id: 'text-contact-info',
                    content: '<h2>Get In Touch</h2><p>Feel free to reach out to us via email or phone. We visit our office for a coffee!</p><hr style="margin: 20px 0; border: 0; border-top: 1px solid #e2e8f0;" /><p><strong>Headquarters</strong><br/>123 Innovation Drive, Tech Valley<br/>San Francisco, CA 94043</p><p><strong>Contact Info</strong><br/>Email: <a href="mailto:hello@example.com" style="color: #2563eb;">hello@example.com</a><br/>Phone: <a href="tel:+1555000000" style="color: #2563eb;">+1 (555) 000-0000</a></p><p><strong>Opening Hours</strong><br/>Monday - Friday: 9:00 AM - 6:00 PM<br/>Saturday: 10:00 AM - 2:00 PM</p>',
                    alignment: 'left'
                }
            }
        ],
        'grid-contact:column-1': [
            {
                type: 'ContactForm',
                props: {
                    id: 'form-contact',
                    title: 'Send us a message',
                    variant: 'card',
                    showSubject: true,
                    showPhone: true
                }
            }
        ]
    }
};

// Testimonials Page
export const testimonialsPageTemplate = {
    content: [
        {
            type: 'Hero',
            props: {
                id: 'hero-reviews',
                title: 'Client Testimonials',
                subtitle: 'Don\'t just take our word for it. See what our customers say.',
                alignment: 'center',
                height: 'small',
                overlay: true,
                backgroundImage: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2032&auto=format&fit=crop'
            }
        },
        { type: 'Spacer', props: { id: 'sp-1', height: 60 } },
        {
            type: 'Grid',
            props: { id: 'grid-reviews-1', columns: 3, gap: 24 }
        },
        { type: 'Spacer', props: { id: 'sp-2', height: 24 } },
        {
            type: 'Grid',
            props: { id: 'grid-reviews-2', columns: 3, gap: 24 }
        }
    ],
    root: { props: { backgroundColor: '#f8fafc', maxWidth: '1200px' } },
    zones: {
        'grid-reviews-1:column-0': [
            {
                type: 'Testimonial',
                props: {
                    id: 'rev-1',
                    name: 'Jessica Reynolds',
                    role: 'Marketing Manager',
                    quote: 'This platform has transformed how we handle our web presence. The intuitive interface makes it easy for our entire team to contribute.',
                    variant: 'card',
                    rating: 5,
                    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop'
                }
            }
        ],
        'grid-reviews-1:column-1': [
            {
                type: 'Testimonial',
                props: {
                    id: 'rev-2',
                    name: 'David Wilson',
                    role: 'Freelance Designer',
                    quote: 'The design flexibility is unmatched. I can implement my custom designs pixel-perfectly without wrestling with code.',
                    variant: 'card',
                    rating: 5,
                    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1887&auto=format&fit=crop'
                }
            }
        ],
        'grid-reviews-1:column-2': [
            {
                type: 'Testimonial',
                props: {
                    id: 'rev-3',
                    name: 'Emma Thompson',
                    role: 'Startup Founder',
                    quote: 'We launched our MVP in days instead of weeks. The support team is also incredibly responsive and helpful.',
                    variant: 'card',
                    rating: 5,
                    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop'
                }
            }
        ],
        'grid-reviews-2:column-0': [
            {
                type: 'Testimonial',
                props: {
                    id: 'rev-4',
                    name: 'Michael Chen',
                    role: 'E-commerce Director',
                    quote: 'Sales have increased by 40% since we switched to this system. The performance optimization is game-changing.',
                    variant: 'card',
                    rating: 5,
                    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop'
                }
            }
        ],
        'grid-reviews-2:column-1': [
            {
                type: 'Testimonial',
                props: {
                    id: 'rev-5',
                    name: 'Sarah Palmer',
                    role: 'Content Strategist',
                    quote: 'A CMS that actually makes sense. The visual editor is exactly what we needed for our content-heavy marketing site.',
                    variant: 'card',
                    rating: 4,
                    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1888&auto=format&fit=crop'
                }
            }
        ],
        'grid-reviews-2:column-2': [
            {
                type: 'Testimonial',
                props: {
                    id: 'rev-6',
                    name: 'James Carter',
                    role: 'CTO, TechFlow',
                    quote: 'Ideally suited for developers and non-technical users alike. The component system is robust and extensible.',
                    variant: 'card',
                    rating: 5,
                    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1887&auto=format&fit=crop'
                }
            }
        ]
    }
};

export const pageTemplates = [
    {
        id: 'blank',
        name: 'Blank Page',
        description: 'Start from scratch with an empty canvas',
        icon: '📄',
        category: 'Basic',
        data: blankTemplate
    },
    {
        id: 'landing',
        name: 'Landing Page',
        description: 'High-conversion landing page with features and CTA',
        icon: '🚀',
        category: 'Marketing',
        data: landingPageTemplate
    },
    {
        id: 'about',
        name: 'About Page',
        description: 'Company story, values, and team members',
        icon: '👥',
        category: 'Basic',
        data: aboutPageTemplate
    },
    {
        id: 'services',
        name: 'Services Page',
        description: 'Service showcases with details and pricing',
        icon: '💼',
        category: 'Business',
        data: servicesPageTemplate
    },
    {
        id: 'portfolio',
        name: 'Portfolio/Gallery',
        description: 'Showcase your work with elegant galleries',
        icon: '🖼️',
        category: 'Creative',
        data: portfolioPageTemplate
    },
    {
        id: 'contact',
        name: 'Contact Page',
        description: 'Get in touch with map, form, and info',
        icon: '📧',
        category: 'Basic',
        data: contactPageTemplate
    },
    {
        id: 'testimonials',
        name: 'Testimonials Page',
        description: 'Social proofgrid to build trust',
        icon: '⭐',
        category: 'Marketing',
        data: testimonialsPageTemplate
    }
];

export default pageTemplates;
