(function () {
              var v = document.getElementById('heroVideo');
              if (!v) return;
              function applyForViewport() {
                var isMobile = window.matchMedia('(max-width: 768px)').matches;
                var wantSrc = isMobile ? 'videos/hero-video-mobile.mp4' : 'videos/hero-video.mp4';
                var wantPoster = isMobile ? 'images/hero-video-poster-mobile.jpg' : 'images/hero-video-poster.jpg';
                if (v.getAttribute('data-current-src') === wantSrc) return;
                v.setAttribute('data-current-src', wantSrc);
                v.poster = wantPoster;
                v.src = wantSrc;
                v.load();
                var playVideo = function () {
                  var p = v.play();
                  if (p && p.catch) {
                    p.catch(function (e) {
                      console.log('Hero video play retry on user interaction', e);
                    });
                  }
                };
                v.addEventListener('canplay', playVideo, { once: true });
                if (v.readyState >= 2) playVideo();
                ['click', 'touchstart', 'scroll'].forEach(function (evt) {
                  window.addEventListener(evt, playVideo, { once: true });
                });
              }
              applyForViewport();
              var resizeTimer;
              window.addEventListener('resize', function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(applyForViewport, 200);
              });
            })();

// showPage is defined further below with full history tracking, cart rendering etc.
    function toggleMobileMenu(btn) {
      btn.classList.toggle('open');
      const page = btn.closest('.page');
      const overlay = page.querySelector('.mobile-overlay');
      const menu = page.querySelector('.mobile-menu');
      overlay.classList.toggle('show');
      menu.classList.toggle('open');
      document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
    }
    function closeMobileMenu() {
      document.querySelectorAll('.hamburger').forEach(b => b.classList.remove('open'));
      document.querySelectorAll('.mobile-overlay').forEach(o => o.classList.remove('show'));
      document.querySelectorAll('.mobile-menu').forEach(m => m.classList.remove('open'));
      document.body.style.overflow = '';
    }

    function mobPillGo(btn, id) {
      document.querySelectorAll('.mob-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showPage(id, btn);
    }

    function selectPayment(el) {
      document.querySelectorAll('.checkout-payment-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      el.querySelector('input[type="radio"]').checked = true;
    }

    // ===== CART (localStorage-backed) =====
    // A real cart, stopgap-simple: persisted client-side, priced client-side for display,
    // but re-priced authoritatively server-side (see api/_products.js) before anything is charged.
    const CART_KEY = 'indimode_cart_v1';

    function parsePrice(priceStr) {
      return parseInt(String(priceStr).replace(/[^0-9]/g, ''), 10) || 0;
    }

    function getCart() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
    }

    function saveCart(cart) {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      updateCartBadge();
    }

    function updateCartBadge() {
      const count = getCart().reduce((sum, i) => sum + i.qty, 0);
      document.querySelectorAll('.cart-count').forEach((el) => { el.textContent = count; });
    }

    function cartTotals(cart) {
      const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
      const tax = Math.round(subtotal * 0.12);
      return { subtotal, tax, total: subtotal + tax };
    }

    function fmtMoney(n) {
      return '(Rs. ' + Math.round(n).toLocaleString('en-IN') + ')';
    }

    function toast(msg) {
      let el = document.getElementById('miniToast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'miniToast';
        el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--dark);color:#fff;padding:12px 24px;border-radius:6px;font-size:13px;z-index:99999;opacity:0;transition:opacity .3s ease;pointer-events:none;';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.opacity = '1';
      clearTimeout(el._toastTimer);
      el._toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 1800);
    }

    // Adds a product to the cart. opts: { qty, size }. Looks the product up in the shared
    // stlData catalog (same source goToProduct() uses) so name/price/image always match.
    function addToCart(productId, opts) {
      opts = opts || {};
      const d = stlData[productId];
      if (!d) return false;
      const qty = Math.max(1, opts.qty || 1);
      const size = opts.size || 'S';
      const cart = getCart();
      const existing = cart.find((i) => i.id === productId && i.size === size);
      if (existing) existing.qty += qty;
      else cart.push({ id: productId, name: d.name, price: parsePrice(d.price), image: d.img, video: d.video || '', color: d.color || '', size, qty });
      saveCart(cart);
      return true;
    }

    function removeFromCartAt(index) {
      const cart = getCart();
      cart.splice(index, 1);
      saveCart(cart);
      renderCartPage();
    }

    function updateCartQtyAt(index, delta) {
      const cart = getCart();
      if (!cart[index]) return;
      cart[index].qty = Math.max(1, cart[index].qty + delta);
      saveCart(cart);
      renderCartPage();
    }

    function renderCartPage() {
      const cart = getCart();
      const itemsWrap = document.getElementById('cartItemsWrap');
      const countEl = document.getElementById('cartItemCount');
      if (!itemsWrap) return;

      if (cart.length === 0) {
        itemsWrap.innerHTML = '<p style="padding:40px 0;color:var(--gray-400);font-size:13px;">Your cart is empty. <a href="#" onclick="event.preventDefault();showPage(\'home\')" style="color:var(--red);">Continue shopping &rarr;</a></p>';
      } else {
        itemsWrap.innerHTML = cart.map((item, idx) => (
          '<div class="cart-row">' +
          '<div class="cart-img" onclick="goToProduct(\'' + item.id + '\')" style="cursor:pointer;">' + (item.video ? '<video src="' + item.video + '" autoplay muted loop playsinline preload="none"></video>' : '<img loading="lazy" src="' + item.image + '" alt="' + item.name + '">') + '</div>' +
          '<div class="cart-details">' +
          '<div class="cart-prod-name" onclick="goToProduct(\'' + item.id + '\')" style="cursor:pointer;">' + item.name + '</div>' +
          '<div class="cart-prod-meta">' + item.size + (item.color ? ' • ' + item.color : '') + '</div>' +
          '<div class="cart-prod-price">' + fmtMoney(item.price) + '</div>' +
          '<div class="cart-qty"><button class="cart-qty-btn" onclick="updateCartQtyAt(' + idx + ', -1)">−</button><div class="cart-qty-val">' + item.qty + '</div><button class="cart-qty-btn" onclick="updateCartQtyAt(' + idx + ', 1)">+</button></div>' +
          '<span class="cart-del" onclick="removeFromCartAt(' + idx + ')">Remove</span>' +
          '</div>' +
          '</div>'
        )).join('');
      }

      const itemCount = cart.reduce((s, i) => s + i.qty, 0);
      if (countEl) countEl.textContent = itemCount + (itemCount === 1 ? ' item in your cart' : ' items in your cart');
      const { subtotal, tax, total } = cartTotals(cart);
      const subtotalEl = document.getElementById('cartSubtotal');
      const taxEl = document.getElementById('cartTax');
      const totalEl = document.getElementById('cartTotalVal');
      if (subtotalEl) subtotalEl.textContent = fmtMoney(subtotal);
      if (taxEl) taxEl.textContent = fmtMoney(tax);
      if (totalEl) totalEl.textContent = fmtMoney(total);
    }

    function goToCheckout() {
      if (getCart().length === 0) {
        toast('Your cart is empty.');
        return;
      }
      renderCheckoutSummary();
      showPage('checkout');
    }

    function renderCheckoutSummary() {
      const cart = getCart();
      const wrap = document.getElementById('checkoutItemsWrap');
      if (wrap) {
        wrap.innerHTML = cart.map((item) => (
          '<div class="checkout-item" onclick="goToProduct(\'' + item.id + '\')" style="cursor:pointer;">' +
          (item.video ? '<video src="' + item.video + '" autoplay muted loop playsinline preload="none"></video>' : '<img loading="lazy" src="' + item.image + '" alt="' + item.name + '">') +
          '<div class="checkout-item-info">' +
          '<div class="checkout-item-name">' + item.name + '</div>' +
          '<div class="checkout-item-meta">' + item.size + (item.color ? ' • ' + item.color : '') + ' • Qty ' + item.qty + '</div>' +
          '<div class="checkout-item-price">' + fmtMoney(item.price) + '</div>' +
          '</div>' +
          '</div>'
        )).join('');
      }
      const { subtotal, tax, total } = cartTotals(cart);
      const subtotalEl = document.getElementById('coSubtotal');
      const taxEl = document.getElementById('coTax');
      const totalEl = document.getElementById('coTotalVal');
      if (subtotalEl) subtotalEl.textContent = fmtMoney(subtotal);
      if (taxEl) taxEl.textContent = fmtMoney(tax);
      if (totalEl) totalEl.textContent = fmtMoney(total);
    }

    // Buy-button wiring: Quick View, Shop the Look drawer, and the Product Detail page each
    // track "which product is currently open" in a variable already used elsewhere in this file
    // (currentQVProductId, currentDrawerProductId, currentPDPProductId) — reuse those rather
    // than re-deriving the id, so this always adds exactly the product the user is looking at.
    function addToCartFromQuickView() {
      if (!currentQVProductId) return;
      const sizeBtn = document.querySelector('.qv-sizes .qv-size.active');
      const qty = parseInt(document.getElementById('qvQtyVal').value, 10) || 1;
      addToCart(currentQVProductId, { qty, size: sizeBtn ? sizeBtn.textContent : 'S' });
      toast('Added to cart');
      closeQuickView();
    }

    function addToCartFromDrawer() {
      if (!currentDrawerProductId) return;
      const sizeBtn = document.querySelector('#stlDrawer .stl-size-btn.active');
      addToCart(currentDrawerProductId, { qty: 1, size: sizeBtn ? sizeBtn.textContent : 'S' });
      toast('Added to cart');
    }

    function buyNowFromDrawer() {
      if (!currentDrawerProductId) return;
      const sizeBtn = document.querySelector('#stlDrawer .stl-size-btn.active');
      addToCart(currentDrawerProductId, { qty: 1, size: sizeBtn ? sizeBtn.textContent : 'S' });
      closeSTLDrawer();
      goToCheckout();
    }

    function addToCartFromPDP() {
      if (!currentPDPProductId) return;
      const sizeBtn = document.querySelector('.pdp2-size-grid button.active');
      if (sizeBtn && (sizeBtn.classList.contains('sold-out') || sizeBtn.disabled)) {
        toast('This size is currently Sold Out');
        return;
      }
      addToCart(currentPDPProductId, { qty: 1, size: sizeBtn ? sizeBtn.textContent : 'S' });
      toast('Added to cart');
      openCartDrawer();
    }

    function buyNowFromPDP() {
      if (!currentPDPProductId) return;
      const sizeBtn = document.querySelector('.pdp2-size-grid button.active');
      if (sizeBtn && (sizeBtn.classList.contains('sold-out') || sizeBtn.disabled)) {
        toast('This size is currently Sold Out');
        return;
      }
      addToCart(currentPDPProductId, { qty: 1, size: sizeBtn ? sizeBtn.textContent : 'S' });
      goToCheckout();
    }

    function getCheckoutPaymentMethod() {
      const checked = document.querySelector('.checkout-payment-option input[type="radio"]:checked');
      return checked ? checked.value : 'card';
    }

    function getCheckoutCustomer() {
      return {
        name: document.getElementById('coFullName').value.trim(),
        email: document.getElementById('coEmail').value.trim(),
        phone: document.getElementById('coPhone').value.trim(),
      };
    }

    function getCheckoutShipping() {
      return {
        line1: document.getElementById('coAddr1').value.trim(),
        line2: document.getElementById('coAddr2').value.trim(),
        city: document.getElementById('coCity').value.trim(),
        state: document.getElementById('coState').value.trim(),
        pincode: document.getElementById('coPincode').value.trim(),
      };
    }

    function showCheckoutError(msg) {
      const el = document.getElementById('checkoutError');
      el.textContent = msg;
      el.style.display = 'block';
    }

    function hideCheckoutError() {
      document.getElementById('checkoutError').style.display = 'none';
    }

    function setPlaceOrderLoading(isLoading) {
      const btn = document.getElementById('placeOrderBtn');
      btn.disabled = isLoading;
      btn.textContent = isLoading ? 'Processing…' : 'Place Order →';
    }

    function showOrderConfirmed(orderId, paymentStatus) {
      saveCart([]); // order placed — empty the cart
      document.getElementById('checkoutFormWrap').style.display = 'none';
      document.getElementById('orderSuccessWrap').style.display = 'block';
      document.getElementById('osOrderId').textContent = orderId;
      document.getElementById('osStatusLine').textContent =
        paymentStatus === 'Pending (COD)'
          ? "You'll pay in cash when your order arrives."
          : 'A confirmation email has been sent to your registered email address.';
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Converts the real cart (name/image/etc, for display) into the minimal {id, qty, size}
    // shape the server APIs need — the server looks up its own price by id, never trusts ours.
    function getCheckoutItemsForApi() {
      return getCart().map((i) => ({ id: i.id, qty: i.qty, size: i.size, color: i.color }));
    }

    async function placeOrder() {
      hideCheckoutError();
      if (getCart().length === 0) {
        showCheckoutError('Your cart is empty.');
        return;
      }
      const customer = getCheckoutCustomer();
      const shipping = getCheckoutShipping();
      const method = getCheckoutPaymentMethod();

      if (!customer.name || !customer.email || !customer.phone) {
        showCheckoutError('Please fill in your name, email and phone number.');
        return;
      }
      if (!shipping.line1 || !shipping.city || !shipping.state || !shipping.pincode) {
        showCheckoutError('Please fill in your full shipping address.');
        return;
      }

      setPlaceOrderLoading(true);
      try {
        if (method === 'cod') {
          const resp = await fetch('/api/place-order', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ method: 'cod', items: getCheckoutItemsForApi(), customer, shipping }),
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || 'Could not place order.');
          showOrderConfirmed(data.orderId, data.paymentStatus);
          return;
        }

        // Card / UPI: create a Razorpay order server-side first (amount is computed there,
        // never trusted from this page), then open the Razorpay Checkout popup.
        const createResp = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: getCheckoutItemsForApi() }),
        });
        const order = await createResp.json();
        if (!createResp.ok) throw new Error(order.error || 'Could not start payment.');

        if (typeof Razorpay === 'undefined') {
          throw new Error('Payment gateway failed to load. Check your connection and try again.');
        }

        const rzp = new Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: 'Indimode',
          description: 'Order payment',
          prefill: { name: customer.name, email: customer.email, contact: customer.phone },
          theme: { color: '#b43217' },
          method: method === 'upi' ? { upi: true, card: false, netbanking: false, wallet: false } : undefined,
          handler: async function (response) {
            setPlaceOrderLoading(true);
            try {
              // 1. Verify Payment Signature via /api/verify-payment endpoint
              const verifySigResp = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifySigData = await verifySigResp.json();
              if (!verifySigResp.ok || !verifySigData.success) {
                throw new Error(verifySigData.error || 'Payment signature verification failed.');
              }

              // 2. Finalize Order & Save to Database via /api/place-order
              const verifyResp = await fetch('/api/place-order', {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                  method,
                  items: getCheckoutItemsForApi(),
                  customer,
                  shipping,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyResp.json();
              if (!verifyResp.ok) throw new Error(verifyData.error || 'Payment verification failed.');
              showOrderConfirmed(verifyData.orderId, verifyData.paymentStatus);
            } catch (err) {
              showCheckoutError(err.message);
            } finally {
              setPlaceOrderLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setPlaceOrderLoading(false);
            },
          },
        });
        rzp.on('payment.failed', function (response) {
          setPlaceOrderLoading(false);
          showCheckoutError('Payment failed: ' + (response.error && response.error.description ? response.error.description : 'please try again.'));
        });
        rzp.open();
      } catch (err) {
        showCheckoutError(err.message);
        setPlaceOrderLoading(false);
        return;
      }
      // Note: for card/upi, loading state is cleared in the Razorpay handler/dismiss callbacks above,
      // not here, since opening the popup is not the end of the flow.
      if (method === 'cod') setPlaceOrderLoading(false);
    }

    function openSizeGuideModal() { const el = document.getElementById('sizeGuideModal'); if (el) el.style.display = 'flex'; }
    function closeSizeGuideModal() { const el = document.getElementById('sizeGuideModal'); if (el) el.style.display = 'none'; }

    function openShippingModal() { const el = document.getElementById('shippingModal'); if (el) el.style.display = 'flex'; }
    function closeShippingModal() { const el = document.getElementById('shippingModal'); if (el) el.style.display = 'none'; }

    function openFaqModal() { const el = document.getElementById('faqModal'); if (el) el.style.display = 'flex'; }
    function closeFaqModal() { const el = document.getElementById('faqModal'); if (el) el.style.display = 'none'; }

    function openArtisansModal() { const el = document.getElementById('artisansModal'); if (el) el.style.display = 'flex'; }
    function closeArtisansModal() { const el = document.getElementById('artisansModal'); if (el) el.style.display = 'none'; }

    var pageHistory = ['home'];

    function showPage(id, btn, isBack) {
      var current = pageHistory[pageHistory.length - 1];
      if (!isBack && current !== id) {
        pageHistory.push(id);
      }
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.page-tabs button').forEach(b => b.classList.remove('active'));
      var targetPage = document.getElementById('page-' + id);
      if (targetPage) {
        targetPage.classList.add('active');
        targetPage.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-rotate, .clip-reveal, .split-text, .stagger-children').forEach(el => el.classList.add('visible'));
      }
      if (btn) btn.classList.add('active');
      if (id === 'cart') renderCartPage();
      if (id === 'checkout') renderCheckoutSummary();
      if (id === 'search') handlePageSearch();
      if (id === 'wishlist') renderWishlistPage();
      window.scrollTo({ top: 0, behavior: 'instant' });
      setTimeout(() => {
        const page = document.getElementById('page-' + id);
        if (page) {
          page.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-rotate, .clip-reveal, .split-text, .stagger-children').forEach(el => el.classList.add('visible'));
          initSplitText();
          initTiltCards();
          initMagneticButtons();
        }
      }, 30);
    }

    function goBackOrHome() {
      if (pageHistory.length > 1) {
        pageHistory.pop(); // remove current page
        var prev = pageHistory.pop(); // get previous page
        showPage(prev, null, true);
      } else {
        showPage('home', null, true);
      }
    }

    function observeReveals() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
      const sel = '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-rotate, .stagger-children, .clip-reveal, .split-text';
      document.querySelectorAll('.page.active ' + sel.split(',').join(', .page.active ')).forEach(el => {
        if (!el.classList.contains('visible')) observer.observe(el);
      });
    }

    // Scroll progress bar
    function updateScrollProgress() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      document.getElementById('scrollProgress').style.width = pct + '%';
    }

    // Nav shrink on scroll
    function updateNavOnScroll() {
      const navs = document.querySelectorAll('.nav');
      navs.forEach(nav => {
        if (window.scrollY > 60) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
      });
    }

    // Parallax on scroll
    function updateParallax() {
      const scrollY = window.scrollY;
      document.querySelectorAll('.hero-bg img, .hero-bg video').forEach(img => {
        img.style.transform = 'scale(' + (1 + scrollY * 0.0001) + ') translateY(' + (scrollY * 0.1) + 'px)';
      });
      document.querySelectorAll('.full-banner-bg').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          const offset = (rect.top / window.innerHeight - 0.5) * -40;
          el.style.transform = 'translateY(' + offset + 'px)';
        }
      });
    }

    // Tilt effect on product cards
    function initTiltCards() {
      document.querySelectorAll('.product-card, .cat-card, .stl-card').forEach(card => {
        card.addEventListener('mousemove', function (e) {
          const rect = this.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          this.style.transform = 'perspective(600px) rotateY(' + (x * 6) + 'deg) rotateX(' + (-y * 6) + 'deg) translateY(-4px)';
        });
        card.addEventListener('mouseleave', function () {
          this.style.transform = '';
        });
      });
    }

    // Magnetic button glow follow
    function initMagneticButtons() {
      document.querySelectorAll('.hero-btn, .wp-cta, .stl-btn-buy').forEach(btn => {
        btn.addEventListener('mousemove', function (e) {
          const rect = this.getBoundingClientRect();
          const mx = ((e.clientX - rect.left) / rect.width * 100);
          const my = ((e.clientY - rect.top) / rect.height * 100);
          this.style.setProperty('--mx', mx + '%');
          this.style.setProperty('--my', my + '%');
        });
      });
    }

    // Split text animation setup
    function initSplitText() {
      document.querySelectorAll('.split-text').forEach(el => {
        if (el.dataset.split) return;
        el.dataset.split = '1';
        const text = el.textContent;
        el.innerHTML = '';
        text.split('').forEach((ch, i) => {
          const span = document.createElement('span');
          span.className = 'char';
          span.textContent = ch === ' ' ? ' ' : ch;
          span.style.transitionDelay = (i * 0.03) + 's';
          el.appendChild(span);
        });
      });
    }

    // Scroll event handler (throttled via rAF)
    let ticking = false;
    // Testimonial card stacking on scroll
    function updateCardStack() {
      var cards = document.querySelectorAll('#testStackGrid .test-card');
      if (!cards.length) return;
      cards.forEach(function (card, i) {
        var rect = card.getBoundingClientRect();
        var stickyTop = 120 + (i * 30);
        var isStuck = rect.top <= stickyTop + 2;
        card.classList.remove('stacked', 'stacked-behind', 'stacked-behind-2');
        if (isStuck) {
          card.classList.add('stacked');
        }
      });
      var stuckCards = document.querySelectorAll('#testStackGrid .test-card.stacked');
      var stuckCount = stuckCards.length;
      stuckCards.forEach(function (card, i) {
        card.classList.remove('stacked-behind', 'stacked-behind-2');
        if (i < stuckCount - 1) {
          var diff = stuckCount - 1 - i;
          if (diff >= 2) card.classList.add('stacked-behind-2');
          else card.classList.add('stacked-behind');
        }
      });
      var viewMoreBtn = document.getElementById('testViewMore');
      if (viewMoreBtn) {
        if (stuckCount === cards.length) {
          viewMoreBtn.classList.add('visible');
        } else {
          viewMoreBtn.classList.remove('visible');
        }
      }
    }

    function showReviewsPage() {
      var btn = document.querySelector('.page-tabs button[onclick*="reviews"]');
      if (btn) { showPage('reviews', btn); }
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateScrollProgress();
          updateNavOnScroll();
          updateParallax();
          updateCardStack();
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Auto-play all videos on page load and user interaction fallback
    function ensureAllVideosPlay() {
      document.querySelectorAll('video').forEach(function (v) {
        v.muted = true;
        v.playsInline = true;
        var p = v.play();
        if (p && p.catch) {
          p.catch(function (err) {
            const retry = function () {
              v.play().catch(function () { });
            };
            ['click', 'touchstart', 'scroll'].forEach(function (e) {
              window.addEventListener(e, retry, { once: true });
            });
          });
        }
      });
    }
    document.addEventListener('DOMContentLoaded', ensureAllVideosPlay);
    window.addEventListener('load', ensureAllVideosPlay);

    // Search overlay with autocomplete
    const searchProducts = [
      { id: 'naina', name: 'The Naina Kurti', cat: 'Kurtas', price: 'Rs. 1,499', img: 'images/naina-1.jpg' },
      { id: 'aditi', name: 'The Aditi Kurti', cat: 'Kurtas', price: 'Rs. 1,699', img: 'images/aditi-1.jpg' },
      { id: 'daisy', name: 'Daisy Daze Beaded Kurti', cat: 'Kurtas', price: 'Rs. 1,699', img: 'images/daisy-1.jpg' },
      { id: 'sonika', name: 'The Sonika Kurti', cat: 'Kurtas', price: 'Rs. 1,699', img: 'images/sonika-1.jpg' },
      { id: 'aria', name: 'The Aria Kurti', cat: 'Kurtas', price: 'Rs. 1,699', img: 'images/aria-1.jpg' },
      { id: 'meher', name: 'The Meher Kurti', cat: 'Kurtas', price: 'Rs. 1,999', img: 'images/meher-1.jpg' },
      { id: 'anya', name: 'The Anya Top', cat: 'Tops', price: 'Rs. 1,499', img: 'images/anya-1.jpg' },
      { id: 'berry', name: 'Berry Bloom Top', cat: 'Tops', price: 'Rs. 1,499', img: 'images/berry-1.jpg' },
      { id: 'heer', name: 'The Heer Set', cat: 'Co-ord Sets', price: 'Rs. 2,999', img: 'images/heer-1.jpg' },
      { id: 'gulaab', name: 'The Gulaab Set', cat: 'Co-ord Sets', price: 'Rs. 2,499', img: 'images/gulaab-1.jpg' },
      { id: 'mocha', name: 'The Mocha Muse Set', cat: 'Co-ord Sets', price: 'Rs. 2,499', img: 'images/mocha-1.jpg' },
      { id: 'veronica', name: 'The Veronica Set', cat: 'Co-ord Sets', price: 'Rs. 2,499', img: 'images/veronica-1.jpg' },
      { id: 'warli', name: 'The Warli Off Duty Set', cat: 'Co-ord Sets', price: 'Rs. 2,499', img: 'images/warli-1.jpg' },
      { id: 'megh', name: 'Megh Oat Beige Palazzo', cat: 'Palazzos', price: 'Rs. 1,395', img: 'images/megh-1.jpg' },
      { id: 'barkha', name: 'Barkha Black Palazzo', cat: 'Palazzos', price: 'Rs. 1,395', img: 'images/barkha-1.jpg' },
      { id: 'balloon', name: 'Oat Balloon Pant', cat: 'Palazzos', price: 'Rs. 1,395', img: 'images/balloon-1.jpg' },
    ];

    // Typewriter for nav search bar
    const searchTerms = ['Kurtas', 'Tops', 'Co-ord Sets', 'Palazzos', 'Beaded Kurtis', 'Block Print Kurtas'];
    let twTimeout = null;
    function topbarAdvance(topbar, dir) {
      var track = topbar.querySelector('.topbar-track');
      var h = 46;
      topbar._current += dir;
      if (topbar._current < 0) topbar._current = topbar._total - 1;
      track.style.transform = 'translateY(-' + (topbar._current * h) + 'px)';
      if (topbar._current >= topbar._total) {
        setTimeout(function () {
          track.style.transition = 'none';
          topbar._current = 0;
          track.style.transform = 'translateY(0)';
          setTimeout(function () {
            track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
          }, 50);
        }, 550);
      }
    }
    function topbarNext(btn) {
      var topbar = btn.closest('.topbar');
      clearInterval(topbar._interval);
      topbarAdvance(topbar, 1);
      topbar._interval = setInterval(function () { topbarAdvance(topbar, 1); }, 3500);
    }
    function topbarPrev(btn) {
      var topbar = btn.closest('.topbar');
      clearInterval(topbar._interval);
      topbarAdvance(topbar, -1);
      topbar._interval = setInterval(function () { topbarAdvance(topbar, 1); }, 3500);
    }

    let twIndex = 0, twCharIndex = 0, twDeleting = false, twActive = false;

    function startNavTypewriter() {
      if (twActive) return;
      twActive = true;
      twIndex = 0; twCharIndex = 0; twDeleting = false;
      navTypeTick();
    }
    function stopNavTypewriter() {
      twActive = false;
      clearTimeout(twTimeout);
    }
    function navTypeTick() {
      if (!twActive) return;
      const field = document.getElementById('searchField');
      const term = searchTerms[twIndex];
      const prefix = 'Search for ';

      if (!twDeleting) {
        twCharIndex++;
        field.placeholder = prefix + term.slice(0, twCharIndex);
        if (twCharIndex >= term.length) {
          twTimeout = setTimeout(() => { twDeleting = true; navTypeTick(); }, 1800);
          return;
        }
        twTimeout = setTimeout(navTypeTick, 80);
      } else {
        twCharIndex--;
        field.placeholder = prefix + term.slice(0, twCharIndex);
        if (twCharIndex <= 0) {
          twDeleting = false;
          twIndex = (twIndex + 1) % searchTerms.length;
          twTimeout = setTimeout(navTypeTick, 400);
          return;
        }
        twTimeout = setTimeout(navTypeTick, 40);
      }
    }

    function openSearch() {
      document.getElementById('searchOverlay').classList.add('show');
      document.getElementById('searchModal').classList.add('show');
      document.body.style.overflow = 'hidden';
      const field = document.getElementById('searchField');
      field.value = '';
      handleSearch('');
      startNavTypewriter();
      field.addEventListener('input', function onType() {
        if (field.value.length > 0) stopNavTypewriter();
        else startNavTypewriter();
      });
    }
    function closeSearch() {
      stopNavTypewriter();
      document.getElementById('searchOverlay').classList.remove('show');
      document.getElementById('searchModal').classList.remove('show');
      document.body.style.overflow = '';
      document.getElementById('searchField').value = '';
      handleSearch('');
    }
    function fillSearch(term) {
      const field = document.getElementById('searchField');
      if (field) field.value = term;
      handleSearch(term);
    }
    function handleSearch(query) {
      const container = document.getElementById('searchResults');
      if (!container) return;
      const q = (query || '').trim().toLowerCase();
      if (!q) {
        container.innerHTML = '<div class="sm-popular"><div class="sm-group-label">Popular Searches</div><div class="sm-popular-tags">' +
          ['Kurtas', 'Beaded Kurti', 'Block Print Kurta', 'Co-ord Set', 'Palazzo', 'Tops', 'Everyday Top']
            .map(t => '<span class="sm-popular-tag" onclick="fillSearch(\'' + t + '\')">' + t + '</span>').join('') +
          '</div></div>';
        return;
      }
      const matches = searchProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.cat.toLowerCase().includes(q) ||
        (p.id && p.id.toLowerCase().includes(q))
      ).slice(0, 8);

      if (!matches.length) {
        container.innerHTML = '<div class="sm-empty">No results found for "' + query + '"</div>';
        return;
      }
      const highlight = (text) => {
        const idx = text.toLowerCase().indexOf(q);
        if (idx === -1) return text;
        return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + q.length) + '</mark>' + text.slice(idx + q.length);
      };
      container.innerHTML = '<div class="sm-group-label">Matching Products (' + matches.length + ')</div>' +
        matches.map(p =>
          '<div class="sm-item" onclick="closeSearch();goToProduct(\'' + p.id + '\')" style="cursor:pointer;">' +
          '<div class="sm-item-img" style="overflow:hidden;border-radius:6px;"><img loading="lazy" src="' + p.img + '" style="width:100%;height:100%;object-fit:cover;display:block;"></div>' +
          '<div class="sm-item-info"><div class="sm-item-name">' + highlight(p.name) + '</div>' +
          '<div class="sm-item-meta">' + p.cat + '</div></div>' +
          '<div class="sm-item-price">(' + p.price + ')</div>' +
          '</div>'
        ).join('');
    }

    function handlePageSearch(query) {
      const input = document.getElementById('pageSearchInput');
      const countEl = document.getElementById('pageSearchCount');
      const gridEl = document.getElementById('pageSearchGrid');
      if (!gridEl) return;

      const q = (query !== undefined ? query : (input ? input.value : '')).trim().toLowerCase();
      if (input && query !== undefined) input.value = query;

      const matches = searchProducts.filter(p =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.cat.toLowerCase().includes(q) ||
        (p.id && p.id.toLowerCase().includes(q))
      );

      if (countEl) {
        countEl.textContent = q ? 'Showing ' + matches.length + ' results for "' + (query || (input ? input.value : '')) + '"' : 'Showing all ' + matches.length + ' products';
      }

      if (matches.length === 0) {
        gridEl.innerHTML = '<div style="grid-column:1/-1; padding:60px 0; text-align:center; color:var(--gray-400);">No products found matching "' + q + '". <br><button onclick="handlePageSearch(\'\')" style="margin-top:16px; padding:10px 20px; background:var(--red); color:#fff; border:none; border-radius:6px; cursor:pointer;">View All Products</button></div>';
        return;
      }

      gridEl.innerHTML = matches.map(p =>
        '<div class="product-card" onclick="goToProduct(\'' + p.id + '\', this)">' +
        '<div class="product-img">' +
        '<div class="ph"><img loading="lazy" src="' + p.img + '" alt="' + p.name + '"></div>' +
        '<span class="product-wishlist" onclick="event.stopPropagation();toggleWishlist(\'' + p.id + '\', this)">♡</span>' +
        '</div>' +
        '<div class="product-info">' +
        '<div class="product-name">' + p.name + '</div>' +
        '<div class="product-price">(' + p.price + ')</div>' +
        '</div>' +
        '</div>'
      ).join('');
    }

    // Shop the Look drawer
    // Shared product catalog — also doubles as the Product Detail page's data source (see goToProduct()).
    const stlData = {
      aditi: {
        name: 'The Aditi Kurti', price: 'Rs. 1,699', img: 'images/aditi-1.jpg', img2: 'images/aditi-2.jpg', gallery: ['images/aditi-1.jpg', 'images/aditi-2.jpg', 'images/aditi-3.jpg', 'images/aditi-4.jpg', 'images/aditi-5.jpg', 'images/aditi-6.jpg', 'images/aditi-7.jpg'], category: 'Kurtas', style: 'Notched Neck Straight Kurti', color: 'Black & White Print', fit: 'Model is wearing S', video: 'videos/reel-d2.mp4', desc: "Crafted from breathable premium cotton, The Aditi Kurti features a refined notched collar and monochrome block print.<br><br>A versatile essential for desk-to-dinner days, combining modern clean lines with traditional printing techniques.", tags: ['Scoop Neckline', 'Flared Bell Sleeves', '100% Mulmul Cotton'], sizes: {
          XS: { chest: '32"', waist: '28"', hip: '36"', length: '27"', pantWaist: '30–32"', pantLength: '40"', qty: 2 },
          S: { chest: '36"', waist: '30"', hip: '38"', length: '27"', pantWaist: '32–34"', pantLength: '40"', qty: 2 },
          M: { chest: '38"', waist: '32"', hip: '40"', length: '28"', pantWaist: '35–37"', pantLength: '41"', qty: 1 },
          L: { chest: '40"', waist: '34"', hip: '42"', length: '29"', pantWaist: '36–38"', pantLength: '41"', qty: 1 },
          XL: { chest: '42"', waist: '36"', hip: '44"', length: '29"', pantWaist: '39–41"', pantLength: '42"', qty: 1 },
          XXL: { chest: '44"', waist: '38"', hip: '46"', length: '30"', pantWaist: '40–42"', pantLength: '43"', qty: 0 }
        }
      },
      mocha: {
        name: 'The Mocha Muse Set', price: 'Rs. 2,499', img: 'images/mocha-1.jpg', img2: 'images/mocha-2.jpg', gallery: ['images/mocha-1.jpg', 'images/mocha-2.jpg', 'images/mocha-3.jpg', 'images/mocha-4.jpg', 'images/mocha-5.jpg', 'images/mocha-6.jpg'], category: 'Co-ord Sets', style: 'Relaxed Co-ord Set', color: 'Mocha Brown', fit: 'Model is wearing S', video: 'videos/reel-d6.mp4', desc: "A halter neck detailing with unique front detailing, paired with relaxed wide-leg pants in the same earthy tone.<br><br>Minimal, comfortable and just the right amount of hot girl energy.<br><br>The kind of co-ord you throw on when you want to look put together without actually trying.", tags: ['Halter-Neck Detailing', 'Extra-Cover Up Neckline'], sizes: {
          XS: { chest: '32–34"', waist: '26–28"', hip: '36–38"', length: '26"', pantWaist: '30"', pantLength: '39"', qty: 2 },
          S: { chest: '34–36"', waist: '28–30"', hip: '36–38"', length: '26"', pantWaist: '32"', pantLength: '40"', qty: 2 },
          M: { chest: '36–38"', waist: '30–32"', hip: '38–40"', length: '26"', pantWaist: '34"', pantLength: '40"', qty: 2 },
          L: { chest: '38–40"', waist: '32–34"', hip: '40–42"', length: '27"', pantWaist: '36"', pantLength: '41"', qty: 2 },
          XL: { chest: '40–42"', waist: '34–36"', hip: '42–44"', length: '27"', pantWaist: '38"', pantLength: '42"', qty: 1 },
          XXL: { chest: '42–44"', waist: '36–38"', hip: '44–46"', length: '27"', pantWaist: '40"', pantLength: '42"', qty: 1 }
        }
      },
      daisy: {
        name: 'Daisy Daze Beaded Kurti', price: 'Rs. 1,699', img: 'images/daisy-1.jpg', img2: 'images/daisy-2.jpg', gallery: ['images/daisy-1.jpg', 'images/daisy-2.jpg', 'images/daisy-3.jpg', 'images/daisy-4.jpg', 'images/daisy-5.jpg', 'images/daisy-6.jpg'], category: 'Kurtas', style: 'Beaded A-line Kurti', color: 'Multicolor Floral', fit: 'Model is wearing S', video: 'videos/reel-d8.mp4', desc: "Embellished with hand-stitched beadwork along the neckline, the Daisy Daze Kurti blends playful floral motifs with effortless A-line tailoring.<br><br>Lightweight, breathable, and made for sunny plans.", tags: ['100% Mul Cotton', 'Corset Fit', 'Beaded Shoulder Strap'], sizes: {
          XS: { chest: '32–34"', waist: '28–30"', hip: '35–37"', length: '21"', pantWaist: '—', pantLength: '—', qty: 8 },
          S: { chest: '36"', waist: '30–32"', hip: '30–32"', length: '22"', pantWaist: '—', pantLength: '—', qty: 6 },
          M: { chest: '37–39"', waist: '32–34"', hip: '38–40"', length: '22"', pantWaist: '—', pantLength: '—', qty: 6 },
          L: { chest: '39–41"', waist: '34–36"', hip: '40–42"', length: '23"', pantWaist: '—', pantLength: '—', qty: 5 },
          XL: { chest: '41–43"', waist: '36–38"', hip: '42–44"', length: '23"', pantWaist: '—', pantLength: '—', qty: 5 },
          XXL: { chest: '44"', waist: '38"', hip: '46"', length: '24"', pantWaist: '—', pantLength: '—', qty: 0 }
        }
      },
      sonika: {
        name: 'The Sonika Kurti', price: 'Rs. 1,699', img: 'images/sonika-1.jpg', img2: 'images/sonika-2.jpg', gallery: ['images/sonika-1.jpg', 'images/sonika-2.jpg', 'images/sonika-3.jpg', 'images/sonika-4.jpg', 'images/sonika-5.jpg', 'images/sonika-6.jpg'], category: 'Kurtas', style: 'Scoop Neck Straight Kurti', color: 'Maroon', fit: 'Model is wearing S', video: 'videos/reel-d5.mp4', desc: "A rich maroon straight kurti featuring a clean scoop neckline and tailored daily fit.<br><br>Cut from ultra-soft cotton fabric with subtle border piping, giving timeless elegance with minimal effort.", tags: ['100% Mulmul Cotton', 'Tie-Up Details'], sizes: {
          XS: { chest: '32–34"', waist: '26–28"', hip: '36–38"', length: '26"', pantWaist: '—', pantLength: '—', qty: 5 },
          S: { chest: '34–36"', waist: '28–30"', hip: '36–38"', length: '27"', pantWaist: '—', pantLength: '—', qty: 2 },
          M: { chest: '36–38"', waist: '30–32"', hip: '38–40"', length: '27"', pantWaist: '—', pantLength: '—', qty: 1 },
          L: { chest: '38–40"', waist: '32–34"', hip: '40–42"', length: '28"', pantWaist: '—', pantLength: '—', qty: 1 },
          XL: { chest: '40–42"', waist: '34–36"', hip: '42–44"', length: '28"', pantWaist: '—', pantLength: '—', qty: 1 },
          XXL: { chest: '42–44"', waist: '36–38"', hip: '44–46"', length: '29"', pantWaist: '—', pantLength: '—', qty: 1 }
        }
      },
      anya: { name: 'The Anya Top', price: 'Rs. 1,499', img: 'images/anya-1.jpg', img2: 'images/anya-2.jpg', gallery: ['images/anya-1.jpg', 'images/anya-2.jpg', 'images/anya-3.jpg', 'images/anya-4.jpg', 'images/anya-5.jpg', 'images/anya-6.jpg'], category: 'Tops', style: 'Cami Top', color: 'Dusty Pink', fit: 'Model is wearing XS', video: 'videos/reel-d13.mp4', desc: "A little desi, a little undone, and very much that girl.<br><br>Cut from breezy 100% cotton, Anya plays with a structured corset silhouette, delicate cut-outs and a lace-up back that lets you make the fit your own.<br><br>Easy enough for everyday, pretty enough to make a moment out of it.", tags: ['100% Cotton', 'Corset Fit'] },
      berry: { name: 'Berry Bloom Top', price: 'Rs. 1,499', img: 'images/berry-1.jpg', img2: 'images/berry-2.jpg', gallery: ['images/berry-1.jpg', 'images/berry-2.jpg', 'images/berry-3.jpg', 'images/berry-4.jpg', 'images/berry-5.jpg', 'images/berry-6.jpg'], category: 'Tops', style: 'Puff Sleeve Top', color: 'Berry Pink', fit: 'Model is wearing S', video: 'videos/reel-d10.mp4', desc: "A little print, a little drama, and a whole lot of desi cool.<br><br>Made in 100% cotton with a flattering fitted silhouette, corset back, this one comes with a matching neck scarf because we’re very much into the extra detail. The playful floral-inspired print brings the colour, while the clean shape keeps it effortlessly modern.<br><br>For slow mornings, sunny plans & wherever the day takes you and after.", tags: ['Scarf Detailing', '100% Cotton', 'Corset Fit'] },
      warli: {
        name: 'The Warli Off Duty Set', price: 'Rs. 2,499', img: 'images/warli-1.jpg', img2: 'images/warli-2.jpg', gallery: ['images/warli-1.jpg', 'images/warli-2.jpg', 'images/warli-3.jpg', 'images/warli-4.jpg'], category: 'Co-ord Sets', style: 'Warli Print Co-ord', color: 'Ivory Print', fit: 'Model is wearing S', video: 'videos/reel-d7.mp4', desc: "For the days when you want a little colour. ❤️<br><br>A breezy printed cami with beaded strap, paired with our easy-breezy red wide-leg pants. The mix of the playful print and bold red is giving desi, but make it effortless.<br><br>Wear it together or break it up either way, it’s a whole look.", tags: ['100% Mul Cotton', 'Corset Fit', 'Beaded Shoulder Strap'], sizes: {
          XS: { chest: '32–34"', waist: '28–30"', hip: '35–37"', length: '21"', pantWaist: '30–32"', pantLength: '40"', qty: 2 },
          S: { chest: '36"', waist: '30–32"', hip: '30–32"', length: '22"', pantWaist: '32–34"', pantLength: '40"', qty: 2 },
          M: { chest: '37–39"', waist: '32–34"', hip: '38–40"', length: '22"', pantWaist: '34–36"', pantLength: '41"', qty: 2 },
          L: { chest: '39–41"', waist: '34–36"', hip: '40–42"', length: '23"', pantWaist: '36–38"', pantLength: '41"', qty: 2 },
          XL: { chest: '41–43"', waist: '36–38"', hip: '42–44"', length: '23"', pantWaist: '38–40"', pantLength: '42"', qty: 1 },
          XXL: { chest: '44"', waist: '38"', hip: '46"', length: '24"', pantWaist: '40–42"', pantLength: '42"', qty: 4 }
        }
      },
      aria: { name: 'The Aria Kurti', price: 'Rs. 1,699', img: 'images/aria-1.jpg', img2: 'images/aria-2.jpg', gallery: ['images/aria-1.jpg', 'images/aria-2.jpg', 'images/aria-3.jpg', 'images/aria-4.jpg'], category: 'Kurtas', style: 'Scoop Neck Corset Kurti', color: 'Wine Red', fit: 'Model is wearing S', video: 'videos/reel-d9.mp4', desc: "Featuring a structured corset silhouette with deep wine-red handloom fabric, The Aria Kurti brings structured drama to contemporary ethnic wear.<br><br>Fits like a glove with soft breathable lining for all-day comfort.", tags: ['Side Corset Fit', '100% Mulmul Cotton', 'Flared Bell Sleeves'] },
      heer: {
        name: 'The Heer Set', price: 'Rs. 2,999', img: 'images/heer-1.jpg', img2: 'images/heer-2.jpg', gallery: ['images/heer-1.jpg', 'images/heer-2.jpg', 'images/heer-3.jpg', 'images/heer-4.jpg', 'images/heer-5.jpg', 'images/heer-6.jpg'], category: 'Co-ord Sets', style: 'Festive Co-ord Set', color: 'Gold', fit: 'Model is wearing S', video: 'videos/reel-d3.mp4', desc: "An opulent festive co-ord set in liquid gold shimmer woven fabric.<br><br>Features a relaxed long tunic top paired with wide-leg trousers. Designed to stand out at festive celebrations and evening gatherings.", tags: ['3-Piece Set', '100% Mulmul Cotton', 'Farshi Set', 'Corset Fit'], sizes: {
          XS: { chest: '32–34"', waist: '27–29"', hip: '36–38"', length: '27"', pantWaist: '30"', pantLength: '40"', qty: 2 },
          S: { chest: '34–36"', waist: '29–31"', hip: '37–39"', length: '28"', pantWaist: '32"', pantLength: '40"', qty: 2 },
          M: { chest: '36–38"', waist: '30–32"', hip: '40–42"', length: '28"', pantWaist: '34"', pantLength: '41"', qty: 1 },
          L: { chest: '38–40"', waist: '32–34"', hip: '40–42"', length: '28"', pantWaist: '36"', pantLength: '41"', qty: 1 },
          XL: { chest: '40–42"', waist: '36–38"', hip: '42–44"', length: '29"', pantWaist: '38"', pantLength: '41"', qty: 1 },
          XXL: { chest: '42–44"', waist: '38–40"', hip: '44–46"', length: '29"', pantWaist: '40"', pantLength: '42"', qty: 0 }
        }
      },
      meher: {
        name: 'The Meher Kurti', price: 'Rs. 1,999', img: 'images/meher-1.jpg', img2: 'images/meher-2.jpg', gallery: ['images/meher-1.jpg', 'images/meher-2.jpg', 'images/meher-3.jpg', 'images/meher-4.jpg', 'images/meher-5.jpg'], category: 'Kurtas', style: 'A-line Kurti', color: 'Sage Green', fit: 'Model is wearing S', video: 'videos/reel-d1.mp4', desc: "Crafted in serene sage green, The Meher Kurti features a flowing A-line silhouette with subtle hand detailing along the chest.<br><br>Breezy, elegant, and perfect for daylight events and family get-togethers.", tags: ['Tassel Detailing', 'Printed Textured Cotton', 'Corset Fit'], sizes: {
          XS: { chest: '32–34"', waist: '26–28"', hip: '36–38"', length: '26"', pantWaist: '—', pantLength: '—', qty: 3 },
          S: { chest: '34–36"', waist: '28–30"', hip: '38–40"', length: '26"', pantWaist: '—', pantLength: '—', qty: 2 },
          M: { chest: '38–40"', waist: '30–32"', hip: '38–40"', length: '26"', pantWaist: '—', pantLength: '—', qty: 2 },
          L: { chest: '38–40"', waist: '32–34"', hip: '40–42"', length: '27"', pantWaist: '—', pantLength: '—', qty: 2 },
          XL: { chest: '40–42"', waist: '34–36"', hip: '44–46"', length: '29"', pantWaist: '—', pantLength: '—', qty: 1 },
          XXL: { chest: '42–44"', waist: '36–38"', hip: '46–48"', length: '29"', pantWaist: '—', pantLength: '—', qty: 1 }
        }
      },
      naina: {
        name: 'The Naina Kurti', price: 'Rs. 1,499', img: 'images/naina-1.jpg', img2: 'images/naina-2.jpg', gallery: ['images/naina-1.jpg', 'images/naina-2.jpg', 'images/naina-3.jpg', 'images/naina-4.jpg'], category: 'Kurtas', style: 'Cami Kurti', color: 'Teal Floral', fit: 'Model is wearing S', video: 'videos/reel-d12.mp4', desc: "A delicate teal floral cami kurti with slender straps and a flattering flared hemline.<br><br>Cool, airy cotton construction made for sunny afternoons and effortless layering.", tags: ['Relaxed Short Sleeve', 'Corset Fit', '100% Mulmul Cotton'], sizes: {
          XS: { chest: '32–34"', waist: '26–28"', hip: '36–37"', length: '26"', pantWaist: '—', pantLength: '—', qty: 4 },
          S: { chest: '34–36"', waist: '28–30"', hip: '36–38"', length: '27"', pantWaist: '—', pantLength: '—', qty: 2 },
          M: { chest: '36–38"', waist: '30–32"', hip: '38–40"', length: '27"', pantWaist: '—', pantLength: '—', qty: 1 },
          L: { chest: '38–40"', waist: '32–34"', hip: '40–42"', length: '28"', pantWaist: '—', pantLength: '—', qty: 1 },
          XL: { chest: '40–42"', waist: '34–36"', hip: '42–44"', length: '28"', pantWaist: '—', pantLength: '—', qty: 1 },
          XXL: { chest: '42–44"', waist: '36–38"', hip: '44–46"', length: '29"', pantWaist: '—', pantLength: '—', qty: 1 }
        }
      },
      gulaab: {
        name: 'The Gulaab Set', price: 'Rs. 2,499', img: 'images/gulaab-1.jpg', img2: 'images/gulaab-2.jpg', gallery: ['images/gulaab-1.jpg', 'images/gulaab-2.jpg', 'images/gulaab-3.jpg', 'images/gulaab-4.jpg', 'images/gulaab-5.jpg'], category: 'Co-ord Sets', style: 'Festive Co-ord Set', color: 'Rose Pink', fit: 'Model is wearing S', video: 'videos/reel-d11.mp4', desc: "A pretty flower block print top with statement flared sleeves and scalloped cuffs, paired with easy maroon pants finished with tiny button details at the hem.<br><br>It’s giving Indian at heart, Gen Z by choice.<br><br>Made for festive plans, dinner dates, random plans basically anywhere you want your outfit to do the talking.", tags: ['Scalloped Detailing', '100% Mulmul Cotton', 'Corset Fit'], sizes: {
          XS: { chest: '32"', waist: '28"', hip: '36"', length: '27"', pantWaist: '30–32"', pantLength: '40"', qty: 3 },
          S: { chest: '36"', waist: '30"', hip: '38"', length: '27"', pantWaist: '32–34"', pantLength: '40"', qty: 3 },
          M: { chest: '38"', waist: '32"', hip: '40"', length: '28"', pantWaist: '35–37"', pantLength: '41"', qty: 2 },
          L: { chest: '40"', waist: '34"', hip: '42"', length: '29"', pantWaist: '36–38"', pantLength: '41"', qty: 2 },
          XL: { chest: '42"', waist: '36"', hip: '44"', length: '29"', pantWaist: '39–41"', pantLength: '42"', qty: 2 },
          XXL: { chest: '44"', waist: '38"', hip: '46"', length: '30"', pantWaist: '40–42"', pantLength: '43"', qty: 1 }
        }
      },
      veronica: {
        name: 'The Veronica Set', price: 'Rs. 2,499', img: 'images/veronica-1.jpg', img2: 'images/veronica-2.jpg', gallery: ['images/veronica-1.jpg', 'images/veronica-2.jpg', 'images/veronica-3.jpg', 'images/veronica-4.jpg', 'images/veronica-5.jpg', 'images/veronica-6.jpg'], category: 'Co-ord Sets', style: 'Relaxed Co-ord Set', color: 'Emerald Green', fit: 'Model is wearing S', video: 'videos/reel-d4.mp4', desc: "Tailored in vibrant emerald green, The Veronica Set combines a modern camp collar tunic with relaxed wide-leg bottoms.<br><br>Silky drape with rich color depth that looks put together effortlessly.", tags: ['Scoop Neckline', 'Halter-Neck Detailing', 'Farshi Look'], sizes: {
          XS: { chest: '32–34"', waist: '26–28"', hip: '36–38"', length: '26"', pantWaist: '30"', pantLength: '40"', qty: 4 },
          S: { chest: '34–36"', waist: '28–30"', hip: '36–38"', length: '27"', pantWaist: '32"', pantLength: '40"', qty: 3 },
          M: { chest: '36–38"', waist: '30–32"', hip: '38–40"', length: '27"', pantWaist: '34"', pantLength: '41"', qty: 2 },
          L: { chest: '38–40"', waist: '32–34"', hip: '40–42"', length: '27"', pantWaist: '36"', pantLength: '41"', qty: 2 },
          XL: { chest: '40–42"', waist: '34–36"', hip: '42–44"', length: '28"', pantWaist: '38"', pantLength: '42"', qty: 1 },
          XXL: { chest: '42–44"', waist: '36–38"', hip: '44–46"', length: '28"', pantWaist: '40"', pantLength: '42"', qty: 1 }
        }
      },
      megh: { name: 'Megh Oat Beige Palazzo', price: 'Rs. 1,395', img: 'images/megh-1.jpg', img2: 'images/megh-2.jpg', gallery: ['images/megh-1.jpg', 'images/megh-2.jpg'], category: 'Palazzos', style: 'Wide Leg Palazzo', color: 'Oat Beige', fit: 'Model is wearing S', video: '', desc: "Breezy wide-leg palazzo pants in soft oat beige cotton.<br><br>Features an elasticated back waistband and deep side pockets for maximum comfort and easy pairing.", tags: ['100% Mulmul Cotton'] },
      barkha: { name: 'Barkha Black Palazzo', price: 'Rs. 1,395', img: 'images/barkha-1.jpg', img2: 'images/barkha-2.jpg', gallery: ['images/barkha-1.jpg', 'images/barkha-2.jpg'], category: 'Palazzos', style: 'Wide Leg Palazzo', color: 'Black', fit: 'Model is wearing S', video: '', desc: "Classic black wide-leg palazzo pants cut from heavy-drape cotton rayon blend.<br><br>Features deep side pockets and flexible waist fit for everyday versatile styling.", tags: ['Heavy-Drape Blend', 'Deep Pockets'] },
      balloon: { name: 'Oat Balloon Pant', price: 'Rs. 1,395', img: 'images/balloon-1.jpg', img2: 'images/balloon-2.jpg', gallery: ['images/balloon-1.jpg', 'images/balloon-2.jpg', 'images/balloon-3.jpg'], category: 'Palazzos', style: 'Balloon Fit Pant', color: 'Oat Beige', fit: 'Model is wearing S', video: '', desc: "Contemporary balloon-fit pants in neutral oat beige.<br><br>Relaxed through the thighs with a tapered ankle finish and elastic waistband.", tags: ['Tapered Ankle', 'Balloon Fit'] }
    };

    function selectPDPSize(btn, productId, sz) {
      btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePDPSizeMeasurements(productId, sz);
    }

    function updatePDPSizeMeasurements(productId, sz) {
      const d = stlData[productId];
      if (!d || !d.sizes || !d.sizes[sz]) return;
      const s = d.sizes[sz];

      const elChest = document.getElementById('pdpMeasureChest');
      const elWaist = document.getElementById('pdpMeasureWaist');
      const elHip = document.getElementById('pdpMeasureHip');
      const elTopLen = document.getElementById('pdpMeasureTopLen');
      const elPantWaist = document.getElementById('pdpMeasurePantWaist');
      const elPantLen = document.getElementById('pdpMeasurePantLen');
      const stockNotice = document.getElementById('pdpStockNotice');
      const btnATC = document.getElementById('pdp2BtnATC');
      const btnBuy = document.getElementById('pdp2BtnBuy');

      if (elChest) elChest.innerHTML = '<span>Chest</span><span>' + s.chest + '</span>';
      if (elWaist) elWaist.innerHTML = '<span>High Waist</span><span>' + s.waist + '</span>';
      if (elHip) elHip.innerHTML = '<span>Hip</span><span>' + s.hip + '</span>';
      if (elTopLen) elTopLen.innerHTML = '<span>Top Length</span><span>' + s.length + '</span>';
      if (elPantWaist) elPantWaist.innerHTML = '<span>Pant Waist</span><span>' + s.pantWaist + '</span>';
      if (elPantLen) elPantLen.innerHTML = '<span>Pant Length</span><span>' + s.pantLength + '</span>';

      const isSoldOut = s.qty === 0 || s.qty === 'x' || s.qty === 'X' || !s.qty;

      if (isSoldOut) {
        if (stockNotice) stockNotice.innerHTML = '<span style="color:var(--red);font-weight:600;">Size ' + sz + ' is Sold Out</span>';
        if (btnATC) {
          btnATC.textContent = 'Sold Out';
          btnATC.disabled = true;
          btnATC.style.opacity = '0.5';
          btnATC.style.cursor = 'not-allowed';
        }
        if (btnBuy) {
          btnBuy.disabled = true;
          btnBuy.style.opacity = '0.5';
          btnBuy.style.cursor = 'not-allowed';
        }
      } else {
        if (stockNotice) stockNotice.innerHTML = '';
        if (btnATC) {
          btnATC.textContent = 'Add to Cart';
          btnATC.disabled = false;
          btnATC.style.opacity = '1';
          btnATC.style.cursor = 'pointer';
        }
        if (btnBuy) {
          btnBuy.disabled = false;
          btnBuy.style.opacity = '1';
          btnBuy.style.cursor = 'pointer';
        }
      }
    }

    let currentDrawerProductId = null;
    function openSTLDrawer(lookId) {
      currentDrawerProductId = lookId;
      const d = stlData[lookId];
      if (d) {
        const elName = document.getElementById('stlName');
        const elPrice = document.getElementById('stlPrice');
        const elImg = document.getElementById('stlDrawerImg');
        if (elName) elName.textContent = d.name;
        if (elPrice) elPrice.textContent = '(' + d.price + ')';
        if (elImg) elImg.src = d.img;

        const sizeRow = document.querySelector('#stlDrawer .stl-size-row');
        if (sizeRow) {
          const sizeKeys = d.sizes ? Object.keys(d.sizes) : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
          let foundActive = false;
          sizeRow.innerHTML = sizeKeys.map(function (sz) {
            const sInfo = d.sizes ? d.sizes[sz] : null;
            const isSoldOut = sInfo && (sInfo.qty === 0 || sInfo.qty === 'x' || sInfo.qty === 'X' || !sInfo.qty);
            let isActive = false;
            if (!foundActive && !isSoldOut) {
              isActive = true;
              foundActive = true;
            }
            const activeCls = isActive ? ' active' : '';
            const disAttr = isSoldOut ? ' disabled style="opacity:0.4;cursor:not-allowed;"' : '';
            return '<button class="stl-size-btn' + activeCls + '" ' + disAttr + ' onclick="selectSTLSize(this)">' + sz + '</button>';
          }).join('');
        }
      }
      const overlay = document.getElementById('stlOverlay');
      const drawer = document.getElementById('stlDrawer');
      if (overlay) overlay.classList.add('show');
      if (drawer) drawer.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    // ===== PDP AUTO-SWIPE CAROUSEL & COUNTER BADGE SYSTEM =====
    let currentPDPImages = [];
    let currentPDPSlideIdx = 0;
    let pdpSlideshowTimer = null;
    let pdpTouchStartX = 0;
    let pdpTouchEndX = 0;

    function updatePDPSlide(idx, animate = true) {
      if (!currentPDPImages || currentPDPImages.length === 0) return;

      if (idx < 0) idx = currentPDPImages.length - 1;
      if (idx >= currentPDPImages.length) idx = 0;

      currentPDPSlideIdx = idx;
      const mainImg = document.getElementById('pdp2MainImgBig');
      const counter = document.getElementById('pdpSlideCounter');

      if (mainImg) {
        if (animate) {
          mainImg.style.opacity = '0.4';
          setTimeout(function () {
            mainImg.src = currentPDPImages[currentPDPSlideIdx];
            mainImg.style.opacity = '1';
          }, 120);
        } else {
          mainImg.src = currentPDPImages[currentPDPSlideIdx];
        }
      }

      if (counter) {
        counter.textContent = (currentPDPSlideIdx + 1) + '/' + currentPDPImages.length;
        counter.style.display = currentPDPImages.length > 1 ? 'block' : 'none';
      }

      // Update active thumbnail state
      const thumbs = document.querySelectorAll('#pdpGalleryStrip .pdp2-gallery-thumb');
      thumbs.forEach(function (thumb, i) {
        if (i === currentPDPSlideIdx) thumb.classList.add('active');
        else thumb.classList.remove('active');
      });
    }

    function startPDPSlideshow() {
      stopPDPSlideshow();
      if (!currentPDPImages || currentPDPImages.length <= 1) return;
      pdpSlideshowTimer = setInterval(function () {
        updatePDPSlide(currentPDPSlideIdx + 1, true);
      }, 2500);
    }

    function stopPDPSlideshow() {
      if (pdpSlideshowTimer) {
        clearInterval(pdpSlideshowTimer);
        pdpSlideshowTimer = null;
      }
    }

    function changePDPSlide(direction) {
      stopPDPSlideshow();
      updatePDPSlide(currentPDPSlideIdx + direction, true);
      startPDPSlideshow();
    }

    function switchPDPMainImg(thumbEl, src) {
      stopPDPSlideshow();
      const idx = currentPDPImages.indexOf(src);
      if (idx > -1) {
        updatePDPSlide(idx, true);
      } else {
        const mainImg = document.getElementById('pdp2MainImgBig');
        if (mainImg) mainImg.src = src;
      }
      startPDPSlideshow();
    }

    function initPDPTouchSwipe() {
      const col = document.getElementById('pdp2MainCol');
      if (!col || col._hasSwipe) return;
      col._hasSwipe = true;

      col.addEventListener('touchstart', function (e) {
        pdpTouchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      col.addEventListener('touchend', function (e) {
        pdpTouchEndX = e.changedTouches[0].screenX;
        const diff = pdpTouchEndX - pdpTouchStartX;
        if (Math.abs(diff) > 40) {
          if (diff < 0) {
            changePDPSlide(1);
          } else {
            changePDPSlide(-1);
          }
        }
      }, { passive: true });
    }

    // Real navigation to a populated Product Detail page — the catalog above is the single
    // source of truth, so whichever product card/look/drawer sent us here always matches.
    let currentPDPProductId = null;
    function goToProduct(productId, btn) {
      const d = stlData[productId];
      if (!d) return;
      currentPDPProductId = productId;

      const mainImg = document.getElementById('pdp2MainImgBig');
      if (mainImg) mainImg.src = d.img;

      const title = document.getElementById('pdpTitle');
      if (title) title.textContent = d.name;

      const styleEl = document.getElementById('pdp2Style');
      if (styleEl) styleEl.textContent = d.style || d.category || 'Shop';

      const color = document.getElementById('pdp2Color');
      if (color) color.textContent = d.color || '—';

      const fit = document.getElementById('pdp2Fit');
      if (fit) fit.textContent = d.fit || 'Model is wearing S';

      const tagsEl = document.getElementById('pdp2Tags');
      if (tagsEl) {
        const itemTags = d.tags || ['100% Pure Cotton', d.category === 'Tops' ? 'Relaxed Fit' : 'Handcrafted'];
        tagsEl.innerHTML = itemTags.map(t => '<span class="pdp2-tag">' + t + '</span>').join('');
      }

      const fitTag = document.getElementById('pdp2FitTag');
      if (fitTag) fitTag.textContent = d.category === 'Tops' ? 'Relaxed Fit' : 'Handloom';

      const price = document.getElementById('pdpPrice');
      if (price) price.textContent = '(' + d.price + ')';

      const descEl = document.getElementById('pdpDescription');
      if (descEl) {
        const defaultDesc = 'Handwoven fabric with intricate detailing. Crafted by master artisans using traditional techniques passed down through generations.';
        descEl.innerHTML = '<p>' + (d.desc || defaultDesc) + '</p>';
      }

      // Render Dynamic Size Grid & Measurements
      const sizeGrid = document.getElementById('pdp2SizeGrid');
      if (sizeGrid) {
        const sizeKeys = d.sizes ? Object.keys(d.sizes) : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        sizeGrid.innerHTML = sizeKeys.map(function (sz, i) {
          const info = d.sizes ? d.sizes[sz] : null;
          const isSoldOut = info && (info.qty === 0 || info.qty === 'x' || info.qty === 'X' || !info.qty);
          const cls = (i === 0 && !isSoldOut ? 'active' : '') + (isSoldOut ? ' sold-out' : '');
          return '<button class="' + cls + '" ' + (isSoldOut ? 'disabled' : '') + ' onclick="selectPDPSize(this, \'' + productId + '\', \'' + sz + '\')">' +
            sz +
            '</button>';
        }).join('');
      }

      const firstAvailSize = d.sizes ? Object.keys(d.sizes).find(k => d.sizes[k].qty !== 0 && d.sizes[k].qty !== 'x') || Object.keys(d.sizes)[0] : 'S';
      updatePDPSizeMeasurements(productId, firstAvailSize);

      // Render Product Photo Gallery & Slideshow (all images of THIS exact dress!)
      const rawImages = (d.gallery && d.gallery.length) ? d.gallery : [d.img, d.img2];
      currentPDPImages = [...new Set(rawImages.filter(Boolean))];
      currentPDPSlideIdx = 0;

      updatePDPSlide(0, false);
      startPDPSlideshow();
      initPDPTouchSwipe();

      const galleryStrip = document.getElementById('pdpGalleryStrip');
      const galleryBox = document.querySelector('.pdp2-gallery-box');
      if (galleryStrip) {
        if (currentPDPImages.length > 1) {
          if (galleryBox) galleryBox.style.display = 'block';
          galleryStrip.innerHTML = currentPDPImages.map(function (src, i) {
            return '<div class="pdp2-gallery-thumb ' + (i === 0 ? 'active' : '') + '" onclick="switchPDPMainImg(this, \'' + src + '\')">' +
              '<img loading="lazy" src="' + src + '" alt="' + d.name + ' view ' + (i + 1) + '">' +
              '</div>';
          }).join('');
        } else {
          if (galleryBox) galleryBox.style.display = 'none';
        }
      }

      // Product Live Reel video handling (Desktop side-thumb vs Mobile dedicated video section)
      const sideThumb = document.getElementById('pdpSideThumb');
      const thumbVideo = document.getElementById('pdpThumbVideo');
      const sideMainImg = document.getElementById('pdpMainImg');
      const videoWrap = document.getElementById('pdp2MobileVideoWrap');
      const videoEl = document.getElementById('pdp2Video');
      const hasDedicatedVideo = d.video && d.video.length > 0 && d.video !== 'videos/workshop-reel.mp4';
      const isMobile = window.innerWidth <= 768;

      if (hasDedicatedVideo) {
        if (isMobile) {
          if (sideThumb) sideThumb.style.display = 'none';
          if (videoWrap && videoEl) {
            videoEl.src = d.video;
            videoEl.load();
            videoEl.play().catch(function (e) { });
            videoWrap.style.display = 'block';
          }
        } else {
          if (videoWrap) videoWrap.style.display = 'none';
          if (sideThumb && thumbVideo) {
            sideThumb.style.display = 'block';
            thumbVideo.src = d.video;
            thumbVideo.load();
            thumbVideo.play().catch(function (e) { });
            if (sideMainImg) sideMainImg.style.display = 'none';
          }
        }
      } else {
        if (sideThumb) sideThumb.style.display = 'none';
        if (videoWrap) {
          if (videoEl) videoEl.removeAttribute('src');
          videoWrap.style.display = 'none';
        }
      }
      // Close any open drawer/quick-view so it doesn't linger over the new page.
      const stlOverlay = document.getElementById('stlOverlay');
      if (stlOverlay) closeSTLDrawer();
      const qvOverlay = document.getElementById('qvOverlay');
      if (qvOverlay) qvOverlay.classList.remove('active');
      updatePDPBookmarkIcon();
      showPage('detail', btn);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    let lastSTLOpenTime = 0;
    function openProductQuick(event, productId) {
      const now = Date.now();
      if (now - lastSTLOpenTime < 250) return; // Prevent double trigger on mobile touch+click
      lastSTLOpenTime = now;

      if (event) {
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
      }
      if (typeof stopSTLCarousel === 'function') stopSTLCarousel();
      openSTLDrawer(productId);
    }
    function closeSTLDrawer() {
      document.getElementById('stlOverlay').classList.remove('show');
      document.getElementById('stlDrawer').classList.remove('show');
      document.body.style.overflow = '';
    }
    function selectSTLColor(el) {
      el.parentElement.querySelectorAll('.stl-color-swatch').forEach(s => s.classList.remove('active'));
      el.classList.add('active');
    }
    function selectSTLSize(el) {
      el.parentElement.querySelectorAll('.stl-size-btn').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      const header = el.parentElement.previousElementSibling;
      if (header) {
        const strong = header.querySelector('strong');
        if (strong) strong.textContent = el.textContent;
      }
    }

    function closeWelcome() {
      document.getElementById('welcomePopup').classList.remove('show');
    }
    // Dismiss the loader as soon as HTML is ready — don't wait for all images/videos
    // (window 'load' would block until all 600+ MB of media finishes, causing minutes-long spinner)
    function dismissLoader() {
      const loader = document.getElementById('pageLoader');
      if (!loader || loader.classList.contains('hidden')) return;
      loader.classList.add('hidden');
      setTimeout(() => {
        const popup = document.getElementById('welcomePopup');
        if (popup) popup.classList.add('show');
      }, 400);
    }
    setTimeout(dismissLoader, 300);
    setTimeout(dismissLoader, 1500);
    // NOTE: welcomePopup click handler is set up in the final <script> block
    // at the bottom of the page (after the element exists in DOM)

    // Capture phase (not bubble) — this must run and stopPropagation *before* the click
    // reaches the .product-card ancestor's own onclick, or the heart click would also
    // navigate to the product page.
    document.addEventListener('click', (e) => {
      const heart = e.target.closest('.product-wishlist');
      if (!heart) return;
      e.stopPropagation();
      heart.classList.toggle('liked');
      heart.textContent = heart.classList.contains('liked') ? '♥' : '♡';
      heart.style.animation = 'none';
      heart.offsetHeight;
      heart.style.animation = 'heartbeat 0.8s ease-in-out';
    }, true);

    document.addEventListener('click', (e) => {
      const header = e.target.closest('.accordion-header');
      if (!header) return;
      header.parentElement.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      const sizeBtn = e.target.closest('.pdp2-size-grid button');
      if (sizeBtn) {
        sizeBtn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        sizeBtn.classList.add('active');
        return;
      }
      const colorThumb = e.target.closest('.pdp2-color-thumb');
      if (colorThumb) {
        colorThumb.parentElement.querySelectorAll('.pdp2-color-thumb').forEach(t => t.classList.remove('active'));
        colorThumb.classList.add('active');
        const img = colorThumb.querySelector('img');
        if (img) document.getElementById('pdp2MainImgBig').src = img.src;
        return;
      }
      const unitBtn = e.target.closest('.pdp2-size-toggle button');
      if (unitBtn) {
        unitBtn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        unitBtn.classList.add('active');
      }
    });

    document.addEventListener('click', (e) => {
      const opt = e.target.closest('.filter-opt');
      if (!opt) return;
      const check = opt.querySelector('.filter-check');
      if (check) check.classList.toggle('checked');
    });

    document.addEventListener('click', (e) => {
      const sizeBtn = e.target.closest('.size-btn:not(.disabled)');
      if (!sizeBtn) return;
      sizeBtn.parentElement.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      sizeBtn.classList.add('active');
    });

    document.addEventListener('click', (e) => {
      const swatch = e.target.closest('.pdp-swatch');
      if (!swatch) return;
      swatch.parentElement.querySelectorAll('.pdp-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
    });

    document.addEventListener('click', (e) => {
      const thumb = e.target.closest('.pdp-thumb');
      if (!thumb) return;
      thumb.parentElement.querySelectorAll('.pdp-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });

    document.addEventListener('click', (e) => {
      const qtyBtn = e.target.closest('.qty-btn, .cart-qty-btn');
      if (!qtyBtn) return;
      const container = qtyBtn.parentElement;
      const valEl = container.querySelector('.qty-val, .cart-qty-val');
      if (!valEl) return;
      let val = parseInt(valEl.textContent) || 1;
      if (qtyBtn.textContent.includes('+') || qtyBtn.textContent.includes('+')) val++;
      else val = Math.max(1, val - 1);
      valEl.textContent = val;
    });

    document.addEventListener('click', (e) => {
      const del = e.target.closest('.cart-del');
      if (!del) return;
      const row = del.closest('.cart-row');
      if (row) {
        row.style.transition = 'all 0.4s ease';
        row.style.opacity = '0';
        row.style.transform = 'translateX(40px)';
        setTimeout(() => row.remove(), 400);
      }
    });

    // Resilience: if a Shop the Looks image fails to load (transient network blip),
    // retry it a couple of times with a short backoff instead of leaving a blank card.
    // Exposed globally so it can also be applied to the cards cloned by the marquee below.
    function attachSTLImageRetry(img) {
      let attempts = 0;
      img.addEventListener('error', function retry() {
        attempts++;
        if (attempts > 3) return;
        setTimeout(() => {
          img.src = img.src.split('?')[0] + '?retry=' + attempts;
        }, 500 * attempts);
      });
    }

    document.addEventListener('DOMContentLoaded', () => {
      updateCartBadge();
      renderCartPage();

      // Hero video: silent by default (required for autoplay to be allowed at all), unmutes
      // itself only while actually in view, and mutes again once scrolled away.
      // Note: some browsers only permit programmatic unmuting after the user has already
      // interacted with the page — if that block kicks in, the video simply stays muted
      // rather than erroring, which is the safest fallback.
      const heroVideo = document.getElementById('heroVideo');
      if (heroVideo) {
        heroVideo.muted = true;
        heroVideo.volume = 0;
      }

      document.querySelectorAll('.stl-card-bg img').forEach(img => {
        attachSTLImageRetry(img);
      });

      // Inject a proper header (logo + close) into every mobile menu panel
      document.querySelectorAll('.mobile-menu').forEach(menu => {
        if (!menu.querySelector('.mobile-menu-header')) {
          const header = document.createElement('div');
          header.className = 'mobile-menu-header';
          header.innerHTML = '<div class="mobile-menu-logo" onclick="closeMobileMenu();showPage(\'home\')" style="cursor:pointer;"><img loading="lazy" src="images/indimode-logo.png" alt="Indimode" class="mobile-menu-logo-img"></div><button class="mobile-menu-close" onclick="closeMobileMenu()" aria-label="Close menu">✕</button>';
          menu.insertBefore(header, menu.firstChild);
        }
      });

      // Varied reveal animations on sections
      document.querySelectorAll('.sec-header').forEach(el => el.classList.add('reveal'));
      document.querySelectorAll('.cat-card').forEach((el, i) => {
        el.classList.add(i % 2 === 0 ? 'reveal-left' : 'reveal-right');
      });
      // test-cards use stacking scroll, not reveal
      document.querySelectorAll('.value-card').forEach(el => el.classList.add('reveal-rotate'));
      document.querySelectorAll('.about-text').forEach(el => el.classList.add('reveal-left'));
      document.querySelectorAll('.about-img').forEach(el => el.classList.add('clip-reveal'));
      document.querySelectorAll('.full-banner-content').forEach(el => el.classList.add('reveal-scale'));
      document.querySelectorAll('.newsletter').forEach(el => el.classList.add('reveal'));
      document.querySelectorAll('.cart-summary').forEach(el => el.classList.add('reveal-right'));
      document.querySelectorAll('.product-card').forEach(el => {
        if (!el.closest('.stagger-children')) el.classList.add('reveal');
      });
      document.querySelectorAll('.stl-card').forEach((el, i) => {
        el.classList.add('reveal-scale');
        el.style.transitionDelay = (i * 0.15) + 's';
      });
      document.querySelectorAll('.ugc-item').forEach((el, i) => {
        el.classList.add('reveal-scale');
        el.style.transitionDelay = (i * 0.08) + 's';
      });

      // Stagger grids
      document.querySelectorAll('.product-grid, .cat-grid, .test-grid, .values-grid, .wishlist-grid, .coll-grid, .insta-grid').forEach(grid => {
        grid.classList.add('stagger-children');
      });

      // Split text on section titles
      document.querySelectorAll('.sec-title').forEach(el => el.classList.add('split-text'));
      initSplitText();

      // Init interactions
      initTiltCards();
      initMagneticButtons();
      observeReveals();

      document.querySelectorAll('.accordion-item:first-child').forEach(item => item.classList.add('open'));
      startNavTypewriter();

      // Vertical ticker for topbar
      document.querySelectorAll('.topbar').forEach(function (topbar) {
        var track = topbar.querySelector('.topbar-track');
        var items = track.querySelectorAll('.topbar-item');
        if (items.length < 2) return;
        track.appendChild(items[0].cloneNode(true));
        topbar._total = items.length;
        topbar._current = 0;
        topbar._interval = setInterval(function () { topbarAdvance(topbar, 1); }, 3500);
      });

    });

    let currentQVProductId = null;
    function openQuickView(card) {
      var name = card.querySelector('.hpm-name').textContent;
      var img = card.querySelector('.hpm-img-default').src;
      var priceEl = card.querySelector('.hpm-price');
      var oldEl = priceEl.querySelector('.hpm-old');
      document.getElementById('qvName').textContent = name;
      document.getElementById('qvImg').src = img;
      var priceHTML = '';
      if (oldEl) priceHTML += '<span class="qv-old">' + oldEl.textContent + '</span> ';
      priceHTML += priceEl.textContent.replace(oldEl ? oldEl.textContent : '', '').trim();
      document.getElementById('qvPrice').innerHTML = priceHTML;
      document.getElementById('qvQtyVal').value = '1';
      document.querySelectorAll('.qv-size').forEach(function (b, i) { b.classList.toggle('active', i === 0); });
      document.getElementById('qvOverlay').classList.add('active');
      document.body.style.overflow = 'hidden';
      // Match this card's product against the shared catalog so "View Full Details" can
      // navigate to a properly populated page instead of the old (broken) showPage('product').
      currentQVProductId = Object.keys(stlData).find(function (id) { return stlData[id].name === name; }) || null;
    }
    function closeQuickView() {
      document.getElementById('qvOverlay').classList.remove('active');
      document.body.style.overflow = '';
    }
    function pickSize(btn) {
      btn.parentElement.querySelectorAll('.qv-size').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    }
    function qvQty(d) {
      var inp = document.getElementById('qvQtyVal');
      var v = Math.max(1, parseInt(inp.value) + d);
      inp.value = v;
    }

    // Shop the Looks — tablet (481–768px): continuous autoscroll marquee (cards sit side by side).
    // Mobile (<=480px) and desktop (>768px) each get a one-look-at-a-time slide — see below.
    (function () {
      var track = document.querySelector('.stl-grid');
      if (!track) return;
      if (window.innerWidth <= 480 || window.innerWidth > 768) return;
      var originalHTML = track.innerHTML;
      track.innerHTML = originalHTML + originalHTML;
      track.querySelectorAll('.stl-card-bg img').forEach(attachSTLImageRetry);
      var singleSetWidth = track.scrollWidth / 2;
      var speed = 0.4; // px per frame
      var paused = false;

      track.addEventListener('mouseenter', function () { paused = true; });
      track.addEventListener('mouseleave', function () { paused = false; });
      track.addEventListener('touchstart', function () { paused = true; }, { passive: true });
      track.addEventListener('touchend', function () { paused = false; });

      function step() {
        if (!paused) {
          track.scrollLeft += speed;
          if (track.scrollLeft >= singleSetWidth) {
            track.scrollLeft -= singleSetWidth;
          }
        }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);

      window.addEventListener('resize', function () {
        singleSetWidth = track.scrollWidth / 2;
      });
    })();

    // Shop the Looks — mobile full-width auto-advancing slide.
    // Uses native scroll-snap (see CSS) instead of manual transform + touch tracking:
    // there is no "paused" flag to get stuck, because every tick just reads the browser's
    // own current scrollLeft and advances one card from wherever the user actually left it.
    (function () {
      if (window.innerWidth > 480) return;
      var grid = document.querySelector('.stl-grid');
      if (!grid) return;
      var cards = grid.querySelectorAll('.stl-card');
      if (cards.length < 2) return;

      var userInteracting = false;
      var resumeTimer = null;
      grid.addEventListener('pointerdown', function () {
        userInteracting = true;
        clearTimeout(resumeTimer);
      });
      window.addEventListener('pointerup', function () {
        resumeTimer = setTimeout(function () { userInteracting = false; }, 2000);
      });

      setInterval(function () {
        if (userInteracting) return;
        var cardW = grid.clientWidth;
        if (!cardW) return;
        var currentIndex = Math.round(grid.scrollLeft / cardW);
        var nextIndex = (currentIndex + 1) % cards.length;
        // Direct assignment (not scrollTo({behavior:'smooth'})) so the position is always
        // correct immediately — the CSS `scroll-behavior: smooth` above animates it when the
        // device's renderer supports it, but correctness never depends on that animation firing.
        grid.scrollLeft = nextIndex * cardW;
      }, 3200);
    })();

    // Shop the Looks — desktop (>768px): one look fills the viewport at a time, auto-advancing,
    // plus manual prev/next arrows. Same reliable "read the live scrollLeft every tick" pattern
    // as the mobile slide above instead of a "paused" flag that can desync.
    var stlDesktopGrid = null, stlDesktopCards = null, stlDesktopUserInteracting = false, stlDesktopResumeTimer = null;
    var stlCarouselFrozen = false;
    function stopSTLCarousel() {
      stlCarouselFrozen = true;
      stlDesktopUserInteracting = true;
    }

    (function () {
      if (window.innerWidth <= 768) return;
      var grid = document.querySelector('.stl-grid');
      if (!grid) return;
      var cards = grid.querySelectorAll('.stl-card');
      if (cards.length < 2) return;
      stlDesktopGrid = grid;
      stlDesktopCards = cards;

      grid.addEventListener('pointerdown', function () {
        stlDesktopUserInteracting = true;
        clearTimeout(stlDesktopResumeTimer);
      });
      window.addEventListener('pointerup', function () {
        if (stlCarouselFrozen) return;
        stlDesktopResumeTimer = setTimeout(function () { stlDesktopUserInteracting = false; }, 3000);
      });

      setInterval(function () {
        if (stlDesktopUserInteracting || stlCarouselFrozen) return;
        var cardW = grid.clientWidth;
        if (!cardW) return;
        var currentIndex = Math.round(grid.scrollLeft / cardW);
        var nextIndex = (currentIndex + 1) % cards.length;
        grid.scrollLeft = nextIndex * cardW;
      }, 4000);
    })();

    function stlDesktopNav(dir) {
      if (!stlDesktopGrid) return;
      stlDesktopUserInteracting = true;
      clearTimeout(stlDesktopResumeTimer);
      var cardW = stlDesktopGrid.clientWidth;
      var currentIndex = Math.round(stlDesktopGrid.scrollLeft / cardW);
      var nextIndex = (currentIndex + dir + stlDesktopCards.length) % stlDesktopCards.length;
      stlDesktopGrid.scrollLeft = nextIndex * cardW;
      stlDesktopResumeTimer = setTimeout(function () { stlDesktopUserInteracting = false; }, 3000);
    }

    // New Arrivals — continuous autoscroll marquee (bento collage).
    // Uses setInterval, not requestAnimationFrame: rAF loops are the exact thing that made
    // the Shop the Looks carousel silently freeze on some devices (low-power mode, background-
    // tab heuristics, certain mobile Safari builds all throttle/suspend rAF unpredictably).
    // setInterval keeps ticking reliably across those same conditions.
    (function () {
      var wrap = document.querySelector('.na3-wrap');
      var track = document.getElementById('na3Track');
      if (!wrap || !track) return;
      var originalHTML = track.innerHTML;
      track.innerHTML = originalHTML + originalHTML;
      var singleSetWidth = track.scrollWidth / 2;
      var stepPx = 1; // px per tick — matches the old ~30px/sec pace (1px every 30ms)

      setInterval(function () {
        if (!singleSetWidth) return;
        wrap.scrollLeft += stepPx;
        if (wrap.scrollLeft >= singleSetWidth) {
          wrap.scrollLeft -= singleSetWidth;
        }
      }, 30);

      window.addEventListener('resize', function () {
        singleSetWidth = track.scrollWidth / 2;
      });
    })();

    // Reusable step-by-step snap + center-focus carousel (used by Beyond the Atelier and Fresh Picks)
    function initCenterCarousel(trackId, cardSelector) {
      cardSelector = cardSelector || '.bta-card';
      var track = document.getElementById(trackId);
      if (!track) return;
      var uniqueCount = track.querySelectorAll(cardSelector).length;
      if (uniqueCount <= 1) {
        // Single item — just center it statically, no looping/duplication needed.
        var onlyCard = track.querySelector(cardSelector);
        if (onlyCard) {
          onlyCard.classList.add('bta-card-solo');
        }
        track.style.justifyContent = 'center';
        track.style.width = '100%';
        track.style.marginLeft = '0';
        return;
      }
      var items = track.innerHTML;
      track.innerHTML = items + items + items;
      var wrap = track.parentElement;
      var cards = track.querySelectorAll(cardSelector);
      var cardCount = cards.length / 3;
      var currentIndex = cardCount;
      var paused = false;
      var cardW = cards[0].offsetWidth;

      track.style.transition = 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';

      var offsets = [];
      (function precompute() {
        var wrapCenter = wrap.offsetWidth / 2;
        for (var i = 0; i < cards.length; i++) {
          var cardCenter = cards[i].offsetLeft + cards[i].offsetWidth / 2;
          offsets[i] = cardCenter - wrapCenter;
        }
      })();

      function getOffset(idx) {
        return offsets[idx] || 0;
      }

      function updateScales() {
        cards.forEach(function (c, i) {
          var dist = Math.abs(i - currentIndex);
          var t = Math.max(0, 1 - dist / 3);
          var s = 0.55 + t * 0.65;
          var b = 0.7 + t * 0.3;
          var shadow = Math.round(t * 40);
          c.style.transition = 'transform 0.7s ease, filter 0.7s ease, box-shadow 0.7s ease';
          c.style.transform = 'scale(' + s.toFixed(3) + ')';
          c.style.filter = 'brightness(' + b.toFixed(2) + ')';
          c.style.boxShadow = shadow > 3 ? '0 ' + shadow / 2 + 'px ' + shadow + 'px rgba(0,0,0,' + (t * 0.25).toFixed(2) + ')' : 'none';
          c.style.zIndex = Math.round(t * 10);
        });
      }

      function goTo(idx) {
        currentIndex = idx;
        track.style.transform = 'translateX(-' + getOffset(idx) + 'px)';
        updateScales();
      }

      function resetLoop() {
        if (currentIndex >= cardCount * 2) {
          track.style.transition = 'none';
          currentIndex = currentIndex - cardCount;
          track.style.transform = 'translateX(-' + getOffset(currentIndex) + 'px)';
          updateScales();
          setTimeout(function () {
            track.style.transition = 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
          }, 50);
        }
        if (currentIndex < cardCount) {
          track.style.transition = 'none';
          currentIndex = currentIndex + cardCount;
          track.style.transform = 'translateX(-' + getOffset(currentIndex) + 'px)';
          updateScales();
          setTimeout(function () {
            track.style.transition = 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
          }, 50);
        }
      }

      function advance() {
        if (paused) return;
        currentIndex++;
        goTo(currentIndex);
        setTimeout(resetLoop, 800);
      }

      goTo(currentIndex);
      var interval = setInterval(advance, 2500);

      wrap.addEventListener('mouseenter', function () { paused = true; });
      wrap.addEventListener('mouseleave', function () { paused = false; });
      wrap.addEventListener('touchstart', function () { paused = true; }, { passive: true });
      wrap.addEventListener('touchend', function () { setTimeout(function () { paused = false; }, 3000); });
    }

    // Continuous-motion center-focus carousel (Fresh Picks) — never stops, no discrete steps.
    // The card nearest the viewport center is scaled up and brightened in real time as it drifts through.
    function initFlowingCenterCarousel(trackId, cardSelector, speed) {
      var track = document.getElementById(trackId);
      if (!track) return;
      var cardSel = cardSelector || '.bta-card';
      var originalHTML = track.innerHTML;
      track.innerHTML = originalHTML + originalHTML;
      var wrap = track.parentElement;
      var cards = Array.prototype.slice.call(track.querySelectorAll(cardSel));
      var singleSetWidth = track.scrollWidth / 2;
      var pos = 0;
      var sp = speed || 0.5;

      // Mobile/desktop browsers cap how many <video> elements can decode/play at once —
      // with cards duplicated for the seamless loop that limit is easily exceeded, which is
      // why some videos silently stall. Only the videos currently near-visible get play();
      // everything else is paused, so we never ask the browser to run more than a handful at once.
      var videos = cards.map(function (c) { return c.querySelector('video'); }).filter(Boolean);
      videos.forEach(function (v) {
        v.removeAttribute('autoplay');
        v.load();
        // Paused videos otherwise show a blank/black box until they're actually played —
        // nudge each one to render its first frame as soon as it has enough data.
        v.addEventListener('loadeddata', function () {
          if (v.currentTime === 0) v.currentTime = 0.01;
        }, { once: true });
      });

      function updateScales() {
        var wrapCenter = wrap.offsetWidth / 2;
        var falloff = wrap.offsetWidth * 0.55;
        for (var i = 0; i < cards.length; i++) {
          var c = cards[i];
          var cardCenter = c.offsetLeft + c.offsetWidth / 2 - pos;
          var dist = Math.abs(cardCenter - wrapCenter);
          var t = Math.max(0, 1 - dist / falloff);
          var s = 0.72 + t * 0.38;
          var b = 0.72 + t * 0.28;
          c.style.transform = 'scale(' + s.toFixed(3) + ')';
          c.style.filter = 'brightness(' + b.toFixed(2) + ')';
          c.style.zIndex = Math.round(t * 10);
          c.style.boxShadow = t > 0.25
            ? '0 ' + Math.round(t * 22) + 'px ' + Math.round(t * 44) + 'px rgba(0,0,0,' + (t * 0.32).toFixed(2) + ')'
            : '0 6px 16px rgba(0,0,0,0.1)';

          var v = c.querySelector('video');
          if (v) {
            var shouldPlay = dist < falloff * 1.6;
            if (shouldPlay && v.paused) {
              v.play().catch(function () { });
            } else if (!shouldPlay && !v.paused) {
              v.pause();
            }
          }
        }
      }

      function step() {
        pos += sp;
        if (pos >= singleSetWidth) pos -= singleSetWidth;
        track.style.transform = 'translateX(-' + pos + 'px)';
        updateScales();
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    initCenterCarousel('btaTrack');
    initFlowingCenterCarousel('fpTrack', '.fp-vcard', 0.55);

    document.querySelectorAll('.hpm-card').forEach(function (card) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function (e) {
        if (e.target.closest('.hpm-cta')) { e.preventDefault(); }
        var name = card.querySelector('.hpm-name').textContent;
        var productId = Object.keys(stlData).find(function (id) { return stlData[id].name === name; });
        if (productId) {
          goToProduct(productId, card);
        }
      });
    });

    // ===== CART DRAWER SYSTEM =====
    // Reads/writes through the same localStorage-backed cart as the rest of the site
    // (getCart/saveCart/addToCart, defined earlier) — this drawer is just another view
    // onto that one source of truth, not a separate cart.
    function openCartDrawer() {
      renderCartDrawer();
      const overlay = document.getElementById('cartDrawerOverlay');
      const drawer = document.getElementById('cartDrawer');
      if (overlay) overlay.classList.add('show');
      if (drawer) drawer.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    function closeCartDrawer() {
      const overlay = document.getElementById('cartDrawerOverlay');
      const drawer = document.getElementById('cartDrawer');
      if (overlay) overlay.classList.remove('show');
      if (drawer) drawer.classList.remove('show');
      document.body.style.overflow = '';
    }

    function updateCartCount() {
      updateCartBadge();
    }

    function renderCartDrawer() {
      const cartItems = getCart();
      const container = document.getElementById('cartDrawerItems');
      const countEl = document.getElementById('cartDrawerCount');
      const subtotalEl = document.getElementById('cartDrawerSubtotal');
      const shippingText = document.getElementById('cartShippingText');
      const shippingFill = document.getElementById('cartShippingFill');
      const totalQty = cartItems.reduce((s, i) => s + i.qty, 0);
      if (countEl) countEl.textContent = '(' + totalQty + ')';

      if (!container) return;

      if (cartItems.length === 0) {
        container.innerHTML = '<div class="cart-empty-state"><p>Your shopping cart is empty.</p><button onclick="closeCartDrawer();showPage(\'shopall\')" class="cart-empty-btn">Explore Kurtis & Sets →</button></div>';
        if (subtotalEl) subtotalEl.textContent = 'Rs. 0';
        if (shippingText) shippingText.textContent = 'Free Shipping on orders above Rs. 1,999!';
        if (shippingFill) shippingFill.style.width = '0%';
        updateCartBadge();
        return;
      }

      let total = 0;
      container.innerHTML = cartItems.map((item, idx) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        return '<div class="cart-item-card">' +
          '<img loading="lazy" src="' + item.image + '" alt="' + item.name + '" class="cart-item-img">' +
          '<div class="cart-item-details">' +
          '<div class="cart-item-title">' + item.name + '</div>' +
          '<div class="cart-item-size">Size: ' + item.size + '</div>' +
          '<div class="cart-item-price">Rs. ' + item.price.toLocaleString() + '</div>' +
          '<div class="cart-qty-stepper">' +
          '<button onclick="changeCartQty(' + idx + ', -1)">-</button>' +
          '<span>' + item.qty + '</span>' +
          '<button onclick="changeCartQty(' + idx + ', 1)">+</button>' +
          '</div>' +
          '</div>' +
          '<button class="cart-item-remove" onclick="removeCartItem(' + idx + ')">✕</button>' +
          '</div>';
      }).join('');

      if (subtotalEl) subtotalEl.textContent = 'Rs. ' + total.toLocaleString();
      updateCartBadge();
      updateModeAddButtons();
    }

    function addModeToCart(productId, event) {
      if (event) event.stopPropagation();
      addToCart(productId, { qty: 1, size: 'S' });
      toast('Added to cart');
      openCartDrawer();
      updateModeAddButtons();
    }

    function updateModeAddButtons() {
      const cart = getCart();
      document.querySelectorAll('.fc-card-add[data-id]').forEach(function (btn) {
        const pid = btn.getAttribute('data-id');
        const count = cart.filter(function (i) { return i.id === pid; }).reduce(function (sum, i) { return sum + i.qty; }, 0);
        if (count > 0) {
          btn.innerHTML = 'Added (' + count + ') <span style="font-weight:700;margin-left:2px;">+</span>';
          btn.classList.add('added');
        } else {
          btn.innerHTML = '+ Add';
          btn.classList.remove('added');
        }
      });
    }

    function changeCartQty(index, delta) {
      const cart = getCart();
      if (!cart[index]) return;
      cart[index].qty += delta;
      if (cart[index].qty <= 0) cart.splice(index, 1);
      saveCart(cart);
      renderCartDrawer();
    }

    function removeCartItem(index) {
      const cart = getCart();
      cart.splice(index, 1);
      saveCart(cart);
      renderCartDrawer();
    }

    // addToCartFromPDP and buyNowFromPDP are defined earlier in the script

    // ===== USER AUTHENTICATION & LOGIN SYSTEM =====
    let currentUser = null; // null when logged out
    let authToken = null;   // JWT token for API requests

    function authHeaders() {
      return authToken ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken } : { 'Content-Type': 'application/json' };
    }

    function switchAuthTab(tab) {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      if (tab === 'login') {
        document.querySelector('.auth-tab:first-child').classList.add('active');
        document.getElementById('authLoginForm').style.display = 'block';
        document.getElementById('authSignupForm').style.display = 'none';
      } else {
        document.querySelector('.auth-tab:last-child').classList.add('active');
        document.getElementById('authLoginForm').style.display = 'none';
        document.getElementById('authSignupForm').style.display = 'block';
      }
    }

    // Save user + token to localStorage
    function persistSession(userData) {
      currentUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.role || 'customer',
        initials: userData.name.split(' ').map(n => n[0]).join('').toUpperCase()
      };
      authToken = userData.token;
      localStorage.setItem('indimode_user', JSON.stringify(currentUser));
      localStorage.setItem('indimode_token', authToken);
    }

    // After login/signup: merge guest wishlist with DB wishlist, then update UI
    function onAuthSuccess(userData) {
      persistSession(userData);
      // Merge guest wishlist items with DB wishlist (deduplicated)
      const dbWishlist = (userData.wishlist && Array.isArray(userData.wishlist)) ? userData.wishlist : [];
      wishlistIds = Array.from(new Set([...wishlistIds, ...dbWishlist]));
      syncWishlistStorage(); // Pushes merged wishlist to DB
      updateAllHeartIcons();
      renderWishlistPage();
      updateUserAuthState();
      loadUserOrders();
      autoFillCheckoutForUser();
    }

    function autoFillCheckoutForUser() {
      if (!currentUser) return;
      const nameEl = document.getElementById('coFullName');
      const emailEl = document.getElementById('coEmail');
      const phoneEl = document.getElementById('coPhone');
      if (nameEl && !nameEl.value) nameEl.value = currentUser.name || '';
      if (emailEl && !emailEl.value) emailEl.value = currentUser.email || '';
      if (phoneEl && !phoneEl.value) phoneEl.value = currentUser.phone || '';
    }

    function handleUserLogin(customName, customEmail) {
      // Quick / Google login via API
      if (customName && customEmail) {
        fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'quick_login', name: customName, email: customEmail })
        })
          .then(r => r.json())
          .then(data => {
            if (data.success && data.user) {
              onAuthSuccess(data.user);
              toast('Signed in as ' + data.user.name);
            }
          })
          .catch(() => { toast('Connection error. Please try again.'); });
        return;
      }

      const emailInput = document.getElementById('loginEmail');
      const passwordInput = document.getElementById('loginPassword');
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) { toast('Please enter email and password.'); return; }

      const submitBtn = document.querySelector('#authLoginForm button[type="submit"]');
      if (submitBtn) { submitBtn.textContent = 'SIGNING IN...'; submitBtn.disabled = true; }

      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.user) {
            onAuthSuccess(data.user);
            toast('Welcome back, ' + data.user.name + '!');
          } else {
            toast(data.error || 'Invalid credentials. Please try again.');
          }
        })
        .catch(() => { toast('Connection error. Please try again.'); })
        .finally(() => { if (submitBtn) { submitBtn.textContent = 'Sign In →'; submitBtn.disabled = false; } });
    }

    function handleUserSignup() {
      const name = (document.getElementById('signupName') || {}).value?.trim() || '';
      const email = (document.getElementById('signupEmail') || {}).value?.trim() || '';
      const phone = (document.getElementById('signupPhone') || {}).value?.trim() || '';
      const password = (document.getElementById('signupPassword') || {}).value || '';

      if (!name || !email || !password) { toast('Please complete all required fields.'); return; }
      if (password.length < 6) { toast('Password must be at least 6 characters.'); return; }

      const submitBtn = document.querySelector('#authSignupForm button[type="submit"]');
      if (submitBtn) { submitBtn.textContent = 'CREATING ACCOUNT...'; submitBtn.disabled = true; }

      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', name, email, phone, password })
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.user) {
            onAuthSuccess(data.user);
            toast('Welcome to Indimode, ' + data.user.name + '!');
          } else {
            toast(data.error || 'Could not create account. Please try again.');
          }
        })
        .catch(() => { toast('Connection error. Please try again.'); })
        .finally(() => { if (submitBtn) { submitBtn.textContent = 'Create Account →'; submitBtn.disabled = false; } });
    }

    function handleUserLogout() {
      currentUser = null;
      authToken = null;
      wishlistIds = [];
      localStorage.removeItem('indimode_user');
      localStorage.removeItem('indimode_token');
      syncWishlistStorage();
      updateAllHeartIcons();
      renderWishlistPage();
      updateUserAuthState();
      toast('Signed out successfully.');
    }

    // Push wishlist changes to DB whenever it changes (called from syncWishlistStorage)
    function pushWishlistToDB() {
      if (!authToken) return; // Not logged in — localStorage only
      fetch('/api/wishlist', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ wishlist: wishlistIds })
      }).catch(() => { }); // Silent — don't interrupt UX
    }

    // Load user's real orders from DB and render in dashboard
    function loadUserOrders() {
      if (!authToken) return;
      const ordersContainer = document.querySelector('.dashboard-card .order-item-box') ||
        document.querySelector('#userOrdersList');
      const card = document.querySelector('.dashboard-card');
      if (!card) return;

      fetch('/api/user-orders', { headers: authHeaders() })
        .then(r => r.json())
        .then(data => {
          if (!data.success || !data.orders) return;
          const orders = data.orders;

          // Find the Active Orders card by its h3
          const cards = document.querySelectorAll('.dashboard-card');
          let ordersCard = null;
          cards.forEach(c => { if (c.querySelector('h3')?.textContent?.includes('Order')) ordersCard = c; });
          if (!ordersCard) return;

          if (orders.length === 0) {
            ordersCard.innerHTML = '<h3>My Orders</h3><p style="color:var(--gray-400);font-size:13px;padding:20px 0;">No orders yet. <a href="#" onclick="event.preventDefault();showPage(\'home\')" style="color:var(--dark);font-weight:600;">Start shopping →</a></p>';
            return;
          }

          const statusColor = { 'Processing': '#e8a020', 'Shipped': '#2196f3', 'In Transit': '#9c27b0', 'Delivered': '#4caf50', 'Cancelled': '#e53935' };
          ordersCard.innerHTML = '<h3>My Orders</h3>' + orders.slice(0, 3).map(o => {
            const firstItem = o.items && o.items[0];
            const color = statusColor[o.status] || '#888';
            return `<div class="order-item-box" style="margin-bottom:12px;">
        <div class="oib-head">
          <span class="oib-id">#${o.orderId}</span>
          <span class="oib-status" style="background:${color}20;color:${color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${o.status}</span>
        </div>
        ${firstItem ? `<div class="oib-body">
          ${firstItem.img ? `<img loading="lazy" src="${firstItem.img}" alt="${firstItem.name}" class="oib-img">` : ''}
          <div>
            <div class="oib-name">${firstItem.name}</div>
            <div class="oib-meta">Size: ${firstItem.size || '—'} • Qty: ${firstItem.qty || 1}</div>
            <div class="oib-price">Rs. ${o.total?.toLocaleString('en-IN') || '—'}</div>
          </div>
        </div>` : ''}
        <div class="oib-track" style="font-size:11px;color:var(--gray-400);margin-top:6px;">
          Placed: ${o.placedAt ? new Date(o.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} • 
          Payment: ${o.paymentStatus || '—'}
        </div>
      </div>`;
          }).join('');
        })
        .catch(() => { }); // Silent failure
    }

    function updateUserAuthState() {
      const loggedOutView = document.getElementById('loginLoggedOutView');
      const loggedInView = document.getElementById('loginLoggedInView');
      const userAvatarLg = document.getElementById('userAvatarLg');
      const userNameHeading = document.getElementById('userNameHeading');
      const userEmailSub = document.getElementById('userEmailSub');

      if (currentUser) {
        if (loggedOutView) loggedOutView.style.display = 'none';
        if (loggedInView) loggedInView.style.display = 'block';
        if (userNameHeading) userNameHeading.textContent = currentUser.name;
        if (userEmailSub) userEmailSub.textContent = currentUser.email + ' • Member since 2026';
        if (userAvatarLg) userAvatarLg.textContent = currentUser.initials || 'U';
        document.querySelectorAll('a[onclick*="login"]').forEach(icon => {
          icon.innerHTML = '<span class="header-user-badge">' + (currentUser.initials || 'U') + '</span>';
        });
        loadUserOrders();
      } else {
        if (loggedOutView) loggedOutView.style.display = 'block';
        if (loggedInView) loggedInView.style.display = 'none';
        document.querySelectorAll('a[onclick*="login"]').forEach(icon => {
          icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 1-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        });
      }
    }

    // Restore saved session on page load + verify token is still valid
    (function restoreSession() {
      try {
        const savedUser = localStorage.getItem('indimode_user');
        const savedToken = localStorage.getItem('indimode_token');
        if (savedUser && savedToken) {
          currentUser = JSON.parse(savedUser);
          authToken = savedToken;
          setTimeout(updateUserAuthState, 50);
          // Verify token is still valid in the background
          fetch('/api/auth', { headers: { 'Authorization': 'Bearer ' + savedToken } })
            .then(r => r.json())
            .then(data => {
              if (!data.success) {
                // Token expired — silently log out
                handleUserLogout();
                toast('Session expired. Please sign in again.');
              } else if (data.user && Array.isArray(data.user.wishlist)) {
                // Sync wishlist from DB on page load
                wishlistIds = data.user.wishlist;
                syncWishlistStorage();
                updateAllHeartIcons();
                renderWishlistPage();
              }
            })
            .catch(() => { }); // Offline — keep local session
        }
      } catch (e) { }
    })();

    // ===== SEARCH SYSTEM =====
    // openSearch, closeSearch, fillSearch, handleSearch are defined earlier in the script

    // closeSearch, fillSearch, handleSearch are defined earlier in the script

    // ===== WISHLIST SYSTEM =====
    let wishlistIds = [];
    try {
      const saved = localStorage.getItem('indimode_wishlist');
      if (saved) wishlistIds = JSON.parse(saved);
    } catch (e) {
      wishlistIds = [];
    }

    function syncWishlistStorage() {
      try {
        localStorage.setItem('indimode_wishlist', JSON.stringify(wishlistIds));
        pushWishlistToDB(); // Sync to MongoDB if logged in
      } catch (e) { }
    }

    function updateAllHeartIcons() {
      document.querySelectorAll('.product-card').forEach(card => {
        const onclick = card.getAttribute('onclick') || '';
        const match = onclick.match(/goToProduct\('([^']+)'/);
        if (match) {
          const id = match[1];
          const heart = card.querySelector('.product-wishlist');
          if (heart) {
            if (wishlistIds.includes(id)) {
              heart.classList.add('liked');
              heart.textContent = '♥';
            } else {
              heart.classList.remove('liked');
              heart.textContent = '♡';
            }
          }
        }
      });
    }

    function toggleWishlist(productId, heartEl) {
      const idx = wishlistIds.indexOf(productId);
      if (idx > -1) {
        wishlistIds.splice(idx, 1);
        toast('Removed from Wishlist');
      } else {
        wishlistIds.push(productId);
        toast('Saved to Wishlist');
      }
      syncWishlistStorage();
      updateAllHeartIcons();
      renderWishlistPage();
    }

    function togglePDPWishlist(btn) {
      if (!currentPDPProductId) return;
      toggleWishlist(currentPDPProductId, btn);
      updatePDPBookmarkIcon();
    }

    function updatePDPBookmarkIcon() {
      const btn = document.getElementById('pdp2BookmarkBtn');
      if (!btn || !currentPDPProductId) return;
      const isSaved = wishlistIds.includes(currentPDPProductId);
      btn.classList.toggle('active', isSaved);
      btn.style.color = isSaved ? 'var(--red)' : '';
      const path = btn.querySelector('svg path');
      if (path) {
        path.setAttribute('fill', isSaved ? 'currentColor' : 'none');
      }
    }

    function renderWishlistPage() {
      const container = document.querySelector('#page-wishlist .wishlist-grid');
      const subhead = document.querySelector('#page-wishlist .wishlist-header p');
      const clearBtn = document.getElementById('clearWishlistBtn');
      if (!container) return;

      if (subhead) {
        subhead.textContent = wishlistIds.length + (wishlistIds.length === 1 ? ' item saved for later' : ' items saved for later');
      }

      if (clearBtn) {
        clearBtn.style.display = wishlistIds.length > 0 ? 'inline-block' : 'none';
      }

      if (wishlistIds.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1;padding:60px 0;text-align:center;color:var(--gray-400);">Your wishlist is empty. <br><a href="#" onclick="event.preventDefault();showPage('home')" style="color:var(--dark);font-weight:600;margin-top:12px;display:inline-block;">Explore Collections →</a></div>`;
        return;
      }

      container.innerHTML = wishlistIds.map(id => {
        const d = stlData[id];
        if (!d) return '';
        return `
      <div class="product-card" onclick="goToProduct('${id}', this)">
        <div class="product-img">
          <div class="ph"><img loading="lazy" src="${d.img}" alt="${d.name}"></div>
          <div class="ph-alt"><img loading="lazy" src="${d.img2 || d.img}" alt="${d.name}"></div>
          <span class="product-wishlist liked" onclick="event.stopPropagation();toggleWishlist('${id}', this)" title="Remove from Wishlist" style="background:rgba(255,255,255,0.92);color:var(--red);font-size:12px;font-weight:bold;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.15);">✕</span>
        </div>
        <div class="product-info">
          <div class="product-name">${d.name}</div>
          <div class="product-price">(${d.price})</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button class="product-add" style="flex:1;" onclick="event.stopPropagation();addToCart('${id}',{qty:1});toast('Added to cart');openCartDrawer();">Add to Cart</button>
          <button class="wishlist-remove-btn" onclick="event.stopPropagation();toggleWishlist('${id}', this);" style="padding:8px 12px;background:rgba(217,56,58,0.08);color:var(--red);border:1px solid rgba(217,56,58,0.2);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.2s ease;">Remove</button>
        </div>
      </div>
    `;
      }).join('');
    }

    function clearWishlist() {
      if (confirm('Are you sure you want to clear your wishlist?')) {
        wishlistIds = [];
        syncWishlistStorage();
        updateAllHeartIcons();
        renderWishlistPage();
        updatePDPBookmarkIcon();
        toast('Wishlist cleared');
      }
    }

    // Initial renders
    updateAllHeartIcons();
    renderWishlistPage();

    // Initial cart count rendering
    renderCartDrawer();

async function handleContactSubmit(event, form) {
      event.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'SEND';
      if (submitBtn) {
        submitBtn.textContent = 'SENDING...';
        submitBtn.disabled = true;
      }

      const inputs = form.querySelectorAll('input, textarea');
      const payload = {
        name: inputs[0] ? inputs[0].value.trim() : '',
        email: inputs[1] ? inputs[1].value.trim() : '',
        phone: inputs[2] ? inputs[2].value.trim() : '',
        comment: inputs[3] ? inputs[3].value.trim() : ''
      };

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          toast('Thank you! Message saved successfully.');
          form.reset();
        } else {
          toast(data.error || 'Could not send message. Please try again.');
        }
      } catch (err) {
        toast('Thank you for reaching out! We will contact you shortly.');
        form.reset();
      } finally {
        if (submitBtn) {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      }
    }

    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-rotate, .clip-reveal, .split-text, .stagger-children').forEach(function (el) {
        el.classList.add('visible');
      });
    });