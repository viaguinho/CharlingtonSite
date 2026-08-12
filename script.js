document.addEventListener('DOMContentLoaded', () => {
    // FAQ Accordion functionality
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Close other open items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Adjust for sticky header
                const headerHeight = document.querySelector('header').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Overview Section Carousel / Slideshow
    const slides = document.querySelectorAll('.overview-slide-content');
    const subtitles = document.querySelectorAll('.overview-subtitle');
    const dots = document.querySelectorAll('.overview-dot');
    let currentSlide = 0;
    const slideIntervalTime = 6000; // 6 segundos por transição
    let slideInterval;

    function showSlide(index) {
        if (index === currentSlide) return;

        // Remover classes do slide ativo anterior
        slides[currentSlide].classList.remove('active');
        subtitles[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');

        // Adicionar classes ao novo slide ativo
        slides[index].classList.add('active');
        subtitles[index].classList.add('active');
        dots[index].classList.add('active');

        currentSlide = index;
    }

    function nextSlide() {
        let next = (currentSlide + 1) % slides.length;
        showSlide(next);
    }

    function startSlideShow() {
        slideInterval = setInterval(nextSlide, slideIntervalTime);
    }

    function resetSlideShow() {
        clearInterval(slideInterval);
        startSlideShow();
    }

    // Inicializar os estados ativos
    slides.forEach((slide, idx) => {
        if (idx === 0) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });

    // Eventos de clique nos dots
    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            showSlide(idx);
            resetSlideShow();
        });
    });

    // Iniciar slideshow se houver slides na página
    if (slides.length > 0) {
        startSlideShow();
    }

    // Swipe support for overview section
    const overviewSection = document.querySelector('.overview-section');
    if (overviewSection) {
        let touchStartX = 0;
        let touchEndX = 0;
        
        overviewSection.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, {passive: true});

        overviewSection.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleOverviewSwipe();
        }, {passive: true});

        function handleOverviewSwipe() {
            const threshold = 50;
            if (touchStartX - touchEndX > threshold) {
                // Swipe left
                let next = (currentSlide + 1) % slides.length;
                showSlide(next);
                resetSlideShow();
            } else if (touchEndX - touchStartX > threshold) {
                // Swipe right
                let prev = (currentSlide - 1 + slides.length) % slides.length;
                showSlide(prev);
                resetSlideShow();
            }
        }
    }

    // Trajectory Section Tabs / Abas Interativas
    const trajectoryTabs = document.querySelectorAll('.trajectory-tab');
    const trajectorySlides = document.querySelectorAll('.trajectory-slide');
    const trajectoryTabsContainer = document.querySelector('.trajectory-tabs');
    
    trajectoryTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            // Desativar tab e slide ativos anteriores
            document.querySelector('.trajectory-tab.active')?.classList.remove('active');
            document.querySelector('.trajectory-slide.active')?.classList.remove('active');
            
            // Ativar novo
            tab.classList.add('active');
            trajectorySlides[index].classList.add('active');

            // Autoscroll para exibir a aba clicada inteira sem cortar palavras
            if (trajectoryTabsContainer) {
                const containerRect = trajectoryTabsContainer.getBoundingClientRect();
                const tabRect = tab.getBoundingClientRect();
                // Posiciona a aba clicada no início visível da barra (com margem de 16px)
                const scrollOffset = trajectoryTabsContainer.scrollLeft + (tabRect.left - containerRect.left) - 16;
                
                trajectoryTabsContainer.scrollTo({
                    left: Math.max(0, scrollOffset),
                    behavior: 'smooth'
                });
            }
        });
    });

    // Blog Accordion (Updates Section)
    const blogItems = document.querySelectorAll('.blog-item');

    blogItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Ignorar cliques se o alvo for um link/botão
            if (e.target.closest('a') || e.target.closest('button')) {
                return;
            }
            
            const isActive = item.classList.contains('active');

            // Fechar outros itens de blog abertos (comportamento de foco de leitura único)
            blogItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });

            // Inverter o estado ativo do item atual
            if (isActive) {
                item.classList.remove('active');
            } else {
                item.classList.add('active');
            }
        });
    });

    // Detectar quando o menu está sobre seções escuras
    const header = document.querySelector('header');
    const darkSections = document.querySelectorAll('.section-dark, .trajectory-section, .testimonial-slider-section, .blog-section, footer');
    
    if (header && darkSections.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: '-30px 0px -90% 0px', // Monitora a linha do menu (30px do topo)
            threshold: 0
        };
        
        const observer = new IntersectionObserver(() => {
            checkMenuTheme();
        }, observerOptions);
        
        darkSections.forEach(section => observer.observe(section));
        
        function checkMenuTheme() {
            let isOnDark = false;
            const headerRect = header.getBoundingClientRect();
            // Ponto central de colisão vertical do header (em pixels do viewport)
            const headerCenterY = headerRect.top + headerRect.height / 2;
            
            darkSections.forEach(section => {
                const rect = section.getBoundingClientRect();
                // Se o centro vertical do menu estiver dentro da seção
                if (headerCenterY >= rect.top && headerCenterY <= rect.bottom) {
                    isOnDark = true;
                }
            });
            
            if (isOnDark) {
                header.classList.add('header-on-dark');
            } else {
                header.classList.remove('header-on-dark');
            }
        }
        
        // Listeners auxiliares para garantir precisão e tempo de resposta instantâneo
        window.addEventListener('scroll', checkMenuTheme, { passive: true });
        window.addEventListener('resize', checkMenuTheme);
        checkMenuTheme();
    }

    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navCapsule = document.querySelector('.nav-capsule');
    const navLinks = document.querySelectorAll('.nav-capsule .nav-link');

    if (mobileMenuToggle && navCapsule) {
        mobileMenuToggle.addEventListener('click', () => {
            const isOpen = navCapsule.classList.contains('open');
            navCapsule.classList.toggle('open');
            mobileMenuToggle.classList.toggle('open');
            document.body.style.overflow = isOpen ? '' : 'hidden'; // Prevent scrolling when open
        });

        // Fechar menu ao clicar num link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navCapsule.classList.remove('open');
                mobileMenuToggle.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // Modal Comunidade Logic
    const triggerModal = document.getElementById('trigger-comunidade-modal');
    const overlayModal = document.getElementById('modal-comunidade-overlay');
    const dialogModal = document.getElementById('modal-comunidade-dialog');
    const btnCloseModal = document.getElementById('btn-close-comunidade-modal');
    const btnBackModal = document.getElementById('btn-back-comunidade-modal');

    if (triggerModal && overlayModal && dialogModal) {
        // Obter os elementos focáveis
        const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        let firstFocusableElement;
        let lastFocusableElement;

        const openModal = (e) => {
            if (e) e.preventDefault();
            overlayModal.classList.remove('force-hidden');
            document.body.style.overflow = 'hidden'; // Lock scroll

            // Configurar Focus Trap
            const focusableContent = dialogModal.querySelectorAll(focusableElements);
            if (focusableContent.length > 0) {
                firstFocusableElement = focusableContent[0];
                lastFocusableElement = focusableContent[focusableContent.length - 1];
                firstFocusableElement.focus();
            }
        };

        const closeModal = (e) => {
            if (e) e.preventDefault();
            overlayModal.classList.add('force-hidden');
            document.body.style.overflow = ''; // Restore scroll
            triggerModal.focus(); // Retorna foco ao botão de origem
        };

        triggerModal.addEventListener('click', openModal);
        if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
        if (btnBackModal) btnBackModal.addEventListener('click', closeModal);

        // Interatividade e Spotlight de Cursor nos Cards do Modal
        const modalBlocks = dialogModal.querySelectorAll('.comunidade-modal-block');
        modalBlocks.forEach(block => {
            block.addEventListener('mousemove', (e) => {
                const rect = block.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                block.style.setProperty('--mouse-x', `${x}px`);
                block.style.setProperty('--mouse-y', `${y}px`);
            });
        });

        // Fechar ao clicar no overlay
        overlayModal.addEventListener('click', (e) => {
            if (e.target === overlayModal) {
                closeModal();
            }
        });

        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            // Se modal aberto e press Esc
            if (e.key === 'Escape' && !overlayModal.classList.contains('force-hidden')) {
                closeModal();
            }

            // Tab Trap
            if (e.key === 'Tab' && !overlayModal.classList.contains('force-hidden')) {
                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstFocusableElement) {
                        lastFocusableElement.focus();
                        e.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastFocusableElement) {
                        firstFocusableElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }

    // Slow down Peixes videos
    const fishVideos = document.querySelectorAll('.comunidade-video, .comunidade-modal-video');
    fishVideos.forEach(video => {
        if (video.src && video.src.includes('Peixes.mp4')) {
            video.playbackRate = 0.35;
            video.addEventListener('loadedmetadata', () => {
                video.playbackRate = 0.35;
            });
            video.addEventListener('play', () => {
                video.playbackRate = 0.35;
            });
        }
    });

});
