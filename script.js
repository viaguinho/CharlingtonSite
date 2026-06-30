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

    // Iniciar slideshow
    startSlideShow();

    // Trajectory Section Tabs / Abas Interativas
    const trajectoryTabs = document.querySelectorAll('.trajectory-tab');
    const trajectorySlides = document.querySelectorAll('.trajectory-slide');
    
    trajectoryTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            // Desativar tab e slide ativos anteriores
            document.querySelector('.trajectory-tab.active')?.classList.remove('active');
            document.querySelector('.trajectory-slide.active')?.classList.remove('active');
            
            // Ativar novo
            tab.classList.add('active');
            trajectorySlides[index].classList.add('active');
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
});
