import socket from './socket.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- State ---
    let currentUser = null;
    let currentToken = localStorage.getItem('token') || null;
    let currentProduct = null;
    let activeChatTab = 'group';
    let activeBuyerChat = null;
    let activeDashTab = 'all';
    let activeDashMode = 'auction'; // 'auction' or 'barter'

    // --- DOM Elements ---
    const views = {
        auth: document.getElementById('auth-view'),
        'about-us': document.getElementById('about-us-view'),
        'new-user': document.getElementById('new-user-view'),
        onboarding: document.getElementById('onboarding-view'),
        home: document.getElementById('home-view'),
        dashboard: document.getElementById('dashboard-view'),
        product: document.getElementById('product-view'),
    };

    // UI Utils
    const showToast = (message, isLoud = false) => {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;

        if (isLoud) {
            toast.style.backgroundColor = '#111827';
            toast.style.color = '#ffffff';
            toast.style.border = '2px solid #ef4444';
            toast.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
            toast.style.padding = '1.5rem';
        } else {
            toast.style.backgroundColor = '';
            toast.style.color = '';
            toast.style.border = '';
            toast.style.boxShadow = '';
            toast.style.padding = '';
        }

        toast.style.transform = 'translateY(0)';
        setTimeout(() => { toast.style.transform = 'translateY(150%)'; }, isLoud ? 6000 : 3000);
    };

    const updateNavbarProfile = () => {
        if (!currentUser) return;
        const imgEl = document.getElementById('nav-profile-img');
        if (!imgEl) return;
        const defaultAvatar = `https://ui-avatars.com/api/?name=${currentUser.firstName || currentUser.username}&background=random`;
        imgEl.src = currentUser.profilePic ? `/api${currentUser.profilePic}` : defaultAvatar;

        const hoverName = document.getElementById('hover-name');
        if (hoverName) hoverName.textContent = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username;

        const hoverUsername = document.getElementById('hover-username');
        if (hoverUsername) hoverUsername.textContent = `@${currentUser.username}`;
    };

    const switchView = (viewName) => {
        Object.values(views).forEach(v => v?.classList.add('hidden'));
        if (views[viewName]) views[viewName].classList.remove('hidden');

        const homeBtn = document.getElementById('nav-home-btn');
        const dashBtn = document.getElementById('nav-dash-btn');

        if (viewName === 'home') {
            homeBtn?.classList.add('active');
            dashBtn?.classList.remove('active');
        } else if (viewName === 'dashboard' || viewName === 'product') {
            dashBtn?.classList.add('active');
            homeBtn?.classList.remove('active');
        }

        const navUser = document.getElementById('nav-user');
        const navLinks = document.getElementById('nav-links');

        if (viewName !== 'auth' && viewName !== 'onboarding' && viewName !== 'about-us' && viewName !== 'new-user') {
            navUser?.classList.remove('hidden');
            navLinks?.classList.remove('hidden');
            navLinks?.classList.add('flex');
            updateNavbarProfile();
        } else {
            navUser?.classList.add('hidden');
            navLinks?.classList.add('hidden');
            navLinks?.classList.remove('flex');
        }

        if (viewName === 'new-user') {
            window.proceedOnboarding(1);
        }
    };

    // Global Listeners for nav
    document.querySelectorAll('.nav-link-custom').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-view');
            if (target) switchView(target);
        });
    });

    // --- Interactive Typing for Auth ---
    const authPhrases = ["Bid smarter ", "Sell faster ", "Value higher "];
    let authPhraseIdx = 0;
    let authCharIdx = 0;
    let authIsDeleting = false;

    const runAuthTyping = () => {
        const el = document.getElementById('hero-typing-line1');
        if (!el) return;

        const currentPhrase = authPhrases[authPhraseIdx];

        if (authIsDeleting) {
            el.textContent = currentPhrase.substring(0, authCharIdx - 1);
            authCharIdx--;
        } else {
            el.textContent = currentPhrase.substring(0, authCharIdx + 1);
            authCharIdx++;
        }

        let typeSpeed = authIsDeleting ? 25 : 80;

        if (!authIsDeleting && authCharIdx === currentPhrase.length) {
            typeSpeed = 2000;
            authIsDeleting = true;
        } else if (authIsDeleting && authCharIdx === 0) {
            authIsDeleting = false;
            authPhraseIdx = (authPhraseIdx + 1) % authPhrases.length;
            typeSpeed = 500;
            const line2 = document.getElementById('hero-typing-line2');
            if (line2) {
                line2.textContent = authPhraseIdx === 0 ? "Win together." : authPhraseIdx === 1 ? "Get cash." : "Maximize profit.";
            }
        }

        setTimeout(runAuthTyping, typeSpeed);
    };

    setTimeout(runAuthTyping, 1000);

    // --- New User Onboarding Flows ---
    let ghostProfile = null;

    window.proceedOnboarding = (step, intent) => {
        const slider = document.getElementById('onboard-slider');
        const step1 = document.getElementById('onboard-step-1');
        const step3 = document.getElementById('onboard-step-3');
        const step2Buy = document.getElementById('onboard-step-2-buy');
        const step2Sell = document.getElementById('onboard-step-2-sell');
        const step2Explore = document.getElementById('onboard-step-2-explore');

        if (!slider || !step1 || !step3) return;

        // Reset all step 2s
        [step2Buy, step2Sell, step2Explore].forEach(el => {
            if (el) {
                el.style.transform = step === 1 ? 'translateX(150%)' : 'translateX(-150%)';
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
            }
        });

        if (step === 1) {
            step1.style.transform = 'translateX(0)';
            step1.style.opacity = '1';
            step1.style.pointerEvents = 'auto';
            step3.style.transform = 'translateX(150%)';
            step3.style.opacity = '0';
            step3.style.pointerEvents = 'none';
        } else if (step === 2) {
            let activeStep2 = null;
            if (intent === 'buy') activeStep2 = step2Buy;
            else if (intent === 'sell') activeStep2 = step2Sell;
            else if (intent === 'explore') activeStep2 = step2Explore;

            step1.style.transform = 'translateX(-150%)';
            step1.style.opacity = '0';
            step1.style.pointerEvents = 'none';

            if (activeStep2) {
                activeStep2.style.transform = 'translateX(0)';
                activeStep2.style.opacity = '1';
                activeStep2.style.pointerEvents = 'auto';
            }

            step3.style.transform = 'translateX(150%)';
            step3.style.opacity = '0';
            step3.style.pointerEvents = 'none';

            if (!ghostProfile) {
                ghostProfile = `Ghost_${Math.floor(Math.random() * 9000) + 1000}`;
                socket.emit('sandbox_join', ghostProfile);
            }

            triggerOnboardTypist();
        } else if (step === 3) {
            step3.style.transform = 'translateX(0)';
            step3.style.opacity = '1';
            step3.style.pointerEvents = 'auto';
        }
    };

    const onboardPhrases = ["Buy smarter.", "Sell faster.", "Bid better."];
    let onboardPhraseIdx = 0;
    let onboardTypistTimeout;

    const triggerOnboardTypist = () => {
        const el = document.getElementById('onboard-typist');
        if (!el) return;

        clearTimeout(onboardTypistTimeout);

        const animateText = () => {
            el.style.transform = 'translateY(100%)';
            setTimeout(() => {
                el.textContent = onboardPhrases[onboardPhraseIdx];
                el.style.transform = 'translateY(0)';
                onboardPhraseIdx = (onboardPhraseIdx + 1) % onboardPhrases.length;

                const newUserView = views['new-user'];
                if (newUserView && !newUserView.classList.contains('hidden')) {
                    onboardTypistTimeout = setTimeout(animateText, 3500);
                }
            }, 500);
        };

        animateText();
    };

    window.triggerDemoBid = () => {
        const btn = document.getElementById('demo-bid-btn');
        if (!globalBuyListingId || !btn) return;
        btn.disabled = true;
        btn.textContent = "Bidding...";
        setTimeout(() => {
            const newPrice = globalBuyListingPrice + 50;
            socket.emit('sandbox_place_bid', {
                listingId: globalBuyListingId,
                amount: newPrice
            });
            // IMMEDIATE UI UPDATE
            globalBuyListingPrice = newPrice;
            const mainPriceEl = document.getElementById('demo-price');
            if (mainPriceEl) {
                mainPriceEl.textContent = `₹${newPrice}`;
            }
            btn.textContent = "Bid Placed!";
            btn.classList.add('bg-emerald-600', 'border-emerald-700');
            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = "Place Demo Bid";
                btn.classList.remove('bg-emerald-600', 'border-emerald-700');
            }, 1500);
        }, 500);
    };

    window.triggerDemoSell = () => {
        const titleEl = document.getElementById('sandbox-sell-title');
        const priceEl = document.getElementById('sandbox-sell-price');
        const title = titleEl?.value.trim();
        const price = priceEl?.value.trim();

        if (!title || !price) {
            showToast('Please enter title and price for dummy item', true);
            return;
        }

        const btn = document.getElementById('sandbox-sell-btn');
        if (!btn) return;
        btn.disabled = true;
        btn.textContent = "Listing...";

        setTimeout(() => {
            socket.emit('sandbox_simulate_listing', { title, price });

            document.getElementById('sandbox-sell-preview')?.classList.remove('opacity-40', 'blur-[2px]', 'scale-95');
            const cardTitle = document.getElementById('sandbox-sell-card-title');
            const cardPrice = document.getElementById('sandbox-sell-card-price');
            if (cardTitle) cardTitle.textContent = title;
            if (cardPrice) cardPrice.textContent = `₹${price}`;
            showToast('Test Listing published to Global Sandbox!');

            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = "Simulate Listing 🚀";
                if (titleEl) titleEl.value = '';
                if (priceEl) priceEl.value = '';
            }, 3000);
        }, 800);
    };

    // Sandbox Socket Listeners
    let globalBuyListingId = null;
    let globalBuyListingPrice = 0;

    const renderSandboxGrid = (listings) => {
        const grid = document.getElementById('sandbox-explore-grid');
        if (!grid) return;
        grid.innerHTML = '';

        listings.forEach((item, idx) => {
            if (idx === 0) {
                globalBuyListingId = item.id;
                globalBuyListingPrice = item.price;
                const demoPriceEl = document.getElementById('demo-price');
                if (demoPriceEl) demoPriceEl.textContent = `₹${item.price}`;
            }

            grid.innerHTML += `
      <div class="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 opacity-100 transform translate-y-0 transition-transform hover:-translate-y-1">
        <div class="w-full h-32 bg-gray-50 rounded-xl mb-3 flex items-center justify-center text-4xl shadow-inner border border-gray-100">${item.emoji}</div>
        <h3 class="font-bold text-sm mb-1 truncate">${item.title}</h3>
        <div class="flex justify-between items-end">
          <p class="text-accent font-mono font-bold text-lg" id="explore-price-${item.id}">₹${item.price}</p>
          <p class="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[60px]">${item.seller}</p>
        </div>
      </div>
    `;
        });
    };

    socket.on('sandbox_snapshot', (listings) => {
        renderSandboxGrid(listings);
    });

    socket.on('sandbox_new_listing', (newListing) => {
        const grid = document.getElementById('sandbox-explore-grid');
        if (grid) {
            const itemHtml = `
      <div class="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 opacity-0 transform translate-y-8 animate-slide-up">
        <div class="w-full h-32 bg-gray-50 rounded-xl mb-3 flex items-center justify-center text-4xl shadow-inner border border-gray-100">${newListing.emoji}</div>
        <h3 class="font-bold text-sm mb-1 truncate">${newListing.title}</h3>
        <div class="flex justify-between items-end">
          <p class="text-accent font-mono font-bold text-lg" id="explore-price-${newListing.id}">₹${newListing.price}</p>
          <p class="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[60px]">${newListing.seller}</p>
        </div>
      </div>
    `;
            grid.insertAdjacentHTML('afterbegin', itemHtml);
        }
    });

    socket.on('sandbox_bid_update', (data) => {
        const { listingId, newPrice, bidder } = data;
        const priceEl = document.getElementById(`explore-price-${listingId}`);
        if (priceEl) {
            priceEl.textContent = `₹${newPrice}`;
            priceEl.classList.add('text-red-500', 'scale-110');
            setTimeout(() => priceEl.classList.remove('text-red-500', 'scale-110'), 600);
        }

        if (listingId === globalBuyListingId) {
            globalBuyListingPrice = newPrice;
            const mainPriceEl = document.getElementById('demo-price');
            const notif = document.getElementById('demo-notification');
            const chatArea = document.getElementById('demo-chat-area');

            if (mainPriceEl) {
                mainPriceEl.textContent = `₹${newPrice}`;
                mainPriceEl.classList.add('text-red-500');
                setTimeout(() => mainPriceEl.classList.remove('text-red-500'), 500);

                if (bidder !== ghostProfile && notif) {
                    notif.style.transform = 'scale(1)';
                    setTimeout(() => { notif.style.transform = 'scale(0)'; }, 3000);
                }

                if (chatArea) {
                    const head = bidder.charAt(0).toUpperCase();
                    const isMe = bidder === ghostProfile;
                    chatArea.innerHTML += `
          <div class="flex items-center gap-2 ${isMe ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'} p-2 rounded-lg border animate-slide-up w-max flex-shrink-0">
            <div class="w-6 h-6 rounded-full ${isMe ? 'bg-emerald-500' : 'bg-blue-500'} text-white flex items-center justify-center text-[10px] font-bold">${head}</div>
            <p class="text-xs font-bold text-gray-800">${isMe ? 'Placed bid' : 'Outbid'}: <span class="text-accent">₹${newPrice}</span></p>
          </div>
        `;
                    while (chatArea.children.length > 2) { chatArea.removeChild(chatArea.firstChild); }
                }
            }
        }
    });

    socket.on('sandbox_ticker', (data) => {
        const track = document.getElementById('sandbox-ticker-track');
        if (track) {
            if (track.children[0] && track.children[0].textContent.includes('Connecting')) {
                track.innerHTML = '';
            }
            const item = document.createElement('span');
            item.className = 'mx-4 text-white font-bold bg-accent px-4 py-1 rounded-full text-xs shadow-md border border-white/20';
            item.textContent = data.text;
            track.insertBefore(item, track.firstChild);
            if (track.children.length > 10) track.removeChild(track.lastChild);
        }
    });

    // #new-user-form submission
    document.getElementById('new-user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailEl = document.getElementById('nu-email');
        const passwordEl = document.getElementById('nu-password');
        const submitBtn = document.getElementById('nu-submit');
        const email = emailEl?.value.trim();
        const password = passwordEl?.value;

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Sending OTP...";
            }
            const data = await apiFetch('/auth/send-otp', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            showToast(data.message, true);

            const emailField = document.getElementById('email');
            const passwordField = document.getElementById('password');
            if (emailField) emailField.value = email;
            if (passwordField) passwordField.value = password;
            isLoginMode = false;

            switchView('auth');
            document.getElementById('auth-credentials-card')?.classList.add('hidden');
            document.getElementById('auth-otp-card')?.classList.remove('hidden');
            const otpTargetEmail = document.getElementById('otp-target-email');
            if (otpTargetEmail) otpTargetEmail.textContent = email;
            const otpField = document.getElementById('otp');
            if (otpField) otpField.value = '';
        } catch (err) {
            showToast(err.message, true);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Send OTP & Register";
            }
        }
    });

    // --- API Helpers ---
    const apiFetch = async (endpoint, options = {}) => {
        const headers = { 'Content-Type': 'application/json' };
        if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
        const response = await fetch(`/api${endpoint}`, { ...options, headers });

        let data;
        try {
            const text = await response.text();
            data = JSON.parse(text);
        } catch (err) {
            throw new Error(response.ok ? 'Invalid response format' : 'Backend server is unreachable. Please ensure the backend is running.');
        }

        if (!response.ok) throw new Error(data.message || 'API Error');
        return data;
    };

    // --- WebSocket Global Events ---
    socket.on('global_ticker', (data) => {
        const track = document.getElementById('live-ticker-track');
        if (track) {
            if (track.children[0] && track.children[0].textContent.includes('Waiting for new trading events')) {
                track.innerHTML = '';
            }
            const item = document.createElement('span');
            item.className = 'mx-4 text-gray-800 font-bold bg-white/50 px-3 py-1 rounded-full border border-indigo-200/50';
            item.textContent = data.text;
            track.appendChild(item);
            if (track.children.length > 15) {
                track.removeChild(track.firstChild);
            }
        }
    });

    socket.on('new_drop', (data) => {
        showToast(data.text, true);
        const track = document.getElementById('live-ticker-track');
        if (track) {
            if (track.children[0] && track.children[0].textContent.includes('Waiting for new trading events')) {
                track.innerHTML = '';
            }
            const item = document.createElement('span');
            item.className = 'mx-4 text-white font-bold bg-black px-4 py-1 rounded-full border border-red-500 shadow-md transform scale-110 shadow-red-500/20';
            item.textContent = data.text;
            track.insertBefore(item, track.firstChild);
        }
    });

    // --- Initialization ---
    const setOnboardingUI = (forEdit = false) => {
        const h2 = document.querySelector('#onboarding-view h2');
        const p = document.querySelector('#onboarding-view p');
        const backBtn = document.getElementById('ob-back-btn');

        if (forEdit) {
            if (h2) h2.textContent = 'Edit Profile';
            if (p) p.textContent = 'Update your personal details below.';
            if (backBtn) backBtn.textContent = 'Cancel';
        } else {
            if (h2) h2.textContent = 'Complete Your Profile';
            if (p) p.textContent = 'Tell us a bit about yourself before you start trading.';
            if (backBtn) backBtn.textContent = 'Cancel & Logout';
        }

        document.getElementById('ob-current-pic')?.classList.add('hidden');
        document.getElementById('ob-remove-pic-container')?.classList.add('hidden');
        const obRemovePic = document.getElementById('ob-remove-pic');
        if (obRemovePic) obRemovePic.checked = false;
    };

    const init = async () => {
        const storedUser = localStorage.getItem('user');
        if (storedUser && currentToken) {
            currentUser = JSON.parse(storedUser);
            if (!currentUser.onboarded) {
                setOnboardingUI(false);
                switchView('onboarding');
            } else {
                loadHomeStats();
                switchView('home');
            }
        } else {
            switchView('auth');
        }
    };

    // --- Auth Logic ---
    let isLoginMode = true;

    document.getElementById('auth-toggle-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;

        const authTitle = document.getElementById('auth-title');
        if (authTitle) authTitle.textContent = isLoginMode ? 'Welcome Back' : 'Create Account';

        const otpField = document.getElementById('otp');
        if (otpField) otpField.value = '';
        const passwordField = document.getElementById('password');
        if (passwordField) passwordField.value = '';

        document.getElementById('auth-credentials-card')?.classList.remove('hidden');
        document.getElementById('auth-otp-card')?.classList.add('hidden');

        const submitBtn = document.getElementById('auth-submit');
        if (submitBtn) submitBtn.textContent = isLoginMode ? 'Sign In Now' : 'Register';

        const toggleText = document.getElementById('auth-toggle-text');
        if (toggleText) toggleText.textContent = isLoginMode ? 'New to CampusBID?' : 'Already an existing user?';
        e.target.textContent = isLoginMode ? 'Create an account' : 'Sign in instead';
    });

    const parseUserFromResponse = (data) => ({
        _id: data._id,
        username: data.username,
        onboarded: data.onboarded,
        profilePic: data.profilePic,
        firstName: data.firstName,
        lastName: data.lastName,
        mobileNumber: data.mobileNumber,
        hostelName: data.hostelName,
        hostelBlock: data.hostelBlock,
        roomNumber: data.roomNumber,
    });

    const postAuthRedirect = () => {
        if (!currentUser.onboarded) {
            setOnboardingUI(false);
            switchView('onboarding');
        } else {
            loadHomeStats();
            switchView('home');
        }
    };

    const clearAuthFields = () => {
        const emailField = document.getElementById('email');
        const passwordField = document.getElementById('password');
        const otpField = document.getElementById('otp');
        if (emailField) emailField.value = '';
        if (passwordField) passwordField.value = '';
        if (otpField) otpField.value = '';
    };

    document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;
        const submitBtn = document.getElementById('auth-submit');

        try {
            if (!isLoginMode) {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending OTP..."; }
                const data = await apiFetch('/auth/send-otp', {
                    method: 'POST',
                    body: JSON.stringify({ email })
                });
                showToast(data.message, true);

                document.getElementById('auth-credentials-card')?.classList.add('hidden');
                document.getElementById('auth-otp-card')?.classList.remove('hidden');
                const otpTargetEmail = document.getElementById('otp-target-email');
                if (otpTargetEmail) otpTargetEmail.textContent = email;
                const otpField = document.getElementById('otp');
                if (otpField) otpField.value = '';
                return;
            }

            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Processing..."; }

            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            currentUser = parseUserFromResponse(data);
            currentToken = data.token;
            localStorage.setItem('user', JSON.stringify(currentUser));
            localStorage.setItem('token', currentToken);

            showToast(`Successfully signed in! Welcome back, @${currentUser.username}!`, true);
            clearAuthFields();
            postAuthRedirect();
        } catch (err) {
            showToast(err.message, true);
        } finally {
            if (submitBtn && submitBtn.disabled) {
                submitBtn.disabled = false;
                submitBtn.textContent = isLoginMode ? 'Sign In Now' : 'Register';
            }
        }
    });

    document.getElementById('otp-cancel-btn')?.addEventListener('click', () => {
        document.getElementById('auth-otp-card')?.classList.add('hidden');
        document.getElementById('auth-credentials-card')?.classList.remove('hidden');
        const otpField = document.getElementById('otp');
        if (otpField) otpField.value = '';
    });

    document.getElementById('otp-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;
        const otp = document.getElementById('otp')?.value.trim();
        const submitBtn = document.getElementById('otp-submit');

        try {
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Verifying..."; }

            const data = await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, otp })
            });

            currentUser = parseUserFromResponse(data);
            currentToken = data.token;
            localStorage.setItem('user', JSON.stringify(currentUser));
            localStorage.setItem('token', currentToken);

            showToast(`Successfully registered! Welcome to CampusBID, @${currentUser.username}!`, true);
            clearAuthFields();

            document.getElementById('auth-otp-card')?.classList.add('hidden');
            document.getElementById('auth-credentials-card')?.classList.remove('hidden');

            postAuthRedirect();
        } catch (err) {
            showToast(err.message, true);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify & Register';
            }
        }
    });

    const performLogout = () => {
        currentUser = null;
        currentToken = null;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        if (currentProduct) {
            socket.emit('leave_product_room', currentProduct._id);
            currentProduct = null;
        }
        switchView('auth');
    };

    document.getElementById('logout-btn')?.addEventListener('click', performLogout);

    document.getElementById('ob-back-btn')?.addEventListener('click', () => {
        if (currentUser?.onboarded) {
            document.getElementById('onboarding-form')?.reset();
            switchView('dashboard');
        } else {
            performLogout();
        }
    });

    document.getElementById('nav-brand')?.addEventListener('click', () => {
        if (currentUser) {
            if (currentProduct) {
                socket.emit('leave_product_room', currentProduct._id);
                currentProduct = null;
            }
            loadHomeStats();
            switchView('home');
        }
    });

    document.getElementById('nav-home-btn')?.addEventListener('click', () => {
        if (currentProduct) {
            socket.emit('leave_product_room', currentProduct._id);
            currentProduct = null;
        }
        loadHomeStats();
        switchView('home');
    });

    document.getElementById('nav-dash-btn')?.addEventListener('click', () => {
        if (currentProduct) {
            socket.emit('leave_product_room', currentProduct._id);
            currentProduct = null;
        }
        document.querySelectorAll('.dash-mode-btn').forEach(btn => btn.classList.remove('active-mode', 'active'));
        document.querySelector(`[data-mode="${activeDashMode}"]`)?.classList.add('active-mode', 'active');
        switchView('dashboard');
        loadProducts();
    });

    // --- Home Stats Logic ---
    const loadHomeStats = async () => {
        try {
            // BUG 2 FIX: use direct market-stats endpoint instead of summing leaderboard
            // (leaderboard groups by hostelName so null-hostel users can skew counts)
            const marketStats = await apiFetch('/analytics/market-stats');
            const statLive = document.getElementById('stat-live-auctions');
            if (statLive) statLive.textContent = marketStats.liveAuctions;
            const statSold = document.getElementById('stat-items-traded');
            if (statSold) statSold.textContent = marketStats.itemsTraded;

            const stats = await apiFetch('/products/stats/leaderboard');
            const leaderboardEl = document.getElementById('home-leaderboard');
            if (leaderboardEl) {
                leaderboardEl.innerHTML = '';

                stats.forEach((stat, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤';
                    leaderboardEl.innerHTML += `
          <li class="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
            <div class="flex items-center gap-3">
              <span class="text-2xl">${medal}</span>
              <span class="font-bold text-gray-800">${stat._id || 'Community'}</span>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-400 font-bold uppercase tracking-wider">Trades</p>
              <p class="font-bold text-lg text-accent">${stat.soldCount}</p>
            </div>
          </li>
        `;
                });
            }

            const craze = await apiFetch('/products/craze');
            const crazeEl = document.getElementById('home-craze-list');
            if (crazeEl) {
                crazeEl.innerHTML = '';
                craze.forEach(p => {
                    crazeEl.innerHTML += `
          <div class="bg-white rounded-2xl border border-red-100 shadow-sm p-4 relative overflow-hidden group cursor-pointer" onclick="document.getElementById('nav-dash-btn').click();">
            <div class="absolute -right-4 -top-4 w-16 h-16 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
            <div class="relative z-10">
              <div class="flex justify-between items-start mb-2">
                <span class="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase tracking-widest animate-pulse">${p.bidCount} Bids!</span>
                <span class="font-mono text-accent font-bold">₹${p.currentPrice}</span>
              </div>
              <h4 class="font-bold text-lg text-gray-800 line-clamp-1 truncate">${p.title}</h4>
              <p class="text-xs text-gray-500 font-medium">by ${p.seller.firstName || ''} (@${p.seller.username})</p>
            </div>
          </div>
        `;
                });
            }

            const categories = await apiFetch('/products/stats/categories');
            const catEl = document.getElementById('trending-categories');
            if (catEl) {
                catEl.innerHTML = '<span class="text-xs font-bold text-indigo-200 uppercase tracking-widest">Trending Categories:</span>';
                categories.forEach(c => {
                    catEl.innerHTML += `<span class="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-bold text-white tracking-widest cursor-default hover:bg-white/20 transition">#${c._id}</span>`;
                });
            }

            const endingSoon = await apiFetch('/products/ending-soon/items');
            const endingSoonEl = document.getElementById('home-ending-soon-list');
            if (endingSoonEl) {
                endingSoonEl.innerHTML = '';
                endingSoon.forEach(p => {
                    endingSoonEl.innerHTML += `
          <div class="bg-white rounded-2xl border border-red-100 shadow-sm p-4 relative overflow-hidden group cursor-pointer" onclick="document.getElementById('nav-dash-btn').click();">
            <div class="absolute -right-4 -top-4 w-16 h-16 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
            <div class="relative z-10">
              <div class="flex justify-between items-start mb-2">
                <div class="flex gap-2">
                  <span class="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase tracking-widest animate-pulse">Ending Soon</span>
                  <span class="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold font-mono ending-soon-timer" data-endtime="${p.endTime}">--:--</span>
                </div>
                <span class="font-mono text-accent font-bold">₹${p.currentPrice || p.basePrice}</span>
              </div>
              <h4 class="font-bold text-lg text-gray-800 line-clamp-1 truncate">${p.title}</h4>
              <p class="text-xs text-gray-500 font-medium">by ${p.seller.firstName || ''} (@${p.seller.username})</p>
            </div>
          </div>
        `;
                });
            }

            const epicBidding = await apiFetch('/products/epic-bidding/items');
            const biddingEl = document.getElementById('home-epic-bidding');
            if (biddingEl) {
                biddingEl.innerHTML = '';
                epicBidding.forEach(p => {
                    biddingEl.innerHTML += `
          <div class="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 cursor-pointer hover:border-emerald-300 transition" onclick="document.getElementById('nav-dash-btn').click();">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-bold text-gray-800 line-clamp-1">${p.title}</p>
                <p class="text-xs text-gray-500">by @${p.seller.username}</p>
              </div>
              <p class="font-mono text-accent font-bold">₹${p.currentPrice || p.basePrice}</p>
            </div>
          </div>
        `;
                });
            }

            const topTraders = await apiFetch('/products/stats/top-traders');
            const tradersEl = document.getElementById('home-top-traders');
            if (tradersEl) {
                tradersEl.innerHTML = '';
                topTraders.forEach((t, i) => {
                    const avatar = t.profilePic ? `/api${t.profilePic}` : `https://ui-avatars.com/api/?name=${t.firstName || t.username}&background=random`;
                    tradersEl.innerHTML += `
          <li class="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
            <div class="flex items-center gap-3">
              <img src="${avatar}" class="w-10 h-10 rounded-full object-cover bg-white border border-gray-200">
              <div>
                <span class="font-bold text-gray-800 text-sm flex items-center gap-1">${t.firstName || t.username} ${i === 0 ? '🌟' : ''}</span>
                <span class="text-xs text-gray-500">@${t.username}</span>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-400 font-bold uppercase tracking-wider">Trades</p>
              <p class="font-bold text-lg text-accent">${t.totalTrades || t.soldCount}</p>
            </div>
          </li>
        `;
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    // --- Onboarding Logic ---
    document.getElementById('onboarding-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('firstName', document.getElementById('ob-fname')?.value || '');
        formData.append('lastName', document.getElementById('ob-lname')?.value || '');
        formData.append('middleName', document.getElementById('ob-mname')?.value || '');
        formData.append('mobileNumber', document.getElementById('ob-mobile')?.value || '');
        formData.append('hostelName', document.getElementById('ob-hostel')?.value || '');
        formData.append('hostelBlock', document.getElementById('ob-block')?.value || '');
        formData.append('roomNumber', document.getElementById('ob-room')?.value || '');

        const picFile = document.getElementById('ob-pic')?.files[0];
        if (picFile) formData.append('profilePic', picFile);

        const removePic = document.getElementById('ob-remove-pic')?.checked;
        formData.append('deleteProfilePic', removePic ? 'true' : 'false');

        try {
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${currentToken}` },
                body: formData
            });

            let data;
            try { data = await response.json(); } catch (ex) { /* ignore */ }

            if (!response.ok) throw new Error(data?.message || 'Error saving profile');

            currentUser = { ...currentUser, ...data };
            localStorage.setItem('user', JSON.stringify(currentUser));

            showToast('Profile updated!');
            switchView('dashboard');
            loadProducts();
        } catch (err) {
            showToast(err.message, true);
        }
    });

    document.getElementById('ob-skip-btn')?.addEventListener('click', async () => {
        const formData = new FormData();
        formData.append('firstName', '');
        formData.append('deleteProfilePic', 'false');

        try {
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${currentToken}` },
                body: formData
            });

            let data;
            try { data = await response.json(); } catch (ex) { /* ignore */ }

            if (!response.ok) throw new Error(data?.message || 'Error skipping profile');

            currentUser = { ...currentUser, ...data };
            localStorage.setItem('user', JSON.stringify(currentUser));

            showToast('Profile setup skipped. Auto-generated handle active.', true);
            switchView('home');
            loadHomeStats();
        } catch (err) {
            showToast(err.message, true);
        }
    });

    // Profile Modal Interactions
    document.getElementById('profile-container')?.addEventListener('click', () => {
        if (!currentUser) return;

        const defaultAvatar = `https://ui-avatars.com/api/?name=${currentUser.firstName || currentUser.username}&background=random`;
        const modalPic = document.getElementById('modal-pic');
        if (modalPic) modalPic.src = currentUser.profilePic ? `/api${currentUser.profilePic}` : defaultAvatar;

        const modalName = document.getElementById('modal-name');
        if (modalName) modalName.textContent = `${currentUser.firstName || ''} ${currentUser.middleName || ''} ${currentUser.lastName || ''}`.replace(/\s+/g, ' ').trim() || currentUser.username;

        const modalUsername = document.getElementById('modal-username');
        if (modalUsername) modalUsername.textContent = `@${currentUser.username}`;

        const modalMobile = document.getElementById('modal-mobile');
        if (modalMobile) modalMobile.textContent = currentUser.mobileNumber || 'N/A';

        const modalHostel = document.getElementById('modal-hostel');
        if (modalHostel) modalHostel.textContent = currentUser.hostelName || 'N/A';

        document.getElementById('profile-modal')?.classList.remove('hidden');

        if (currentUser.isVerified) {
            document.getElementById('modal-verified-badge')?.classList.remove('hidden');
        } else {
            document.getElementById('modal-verified-badge')?.classList.add('hidden');
        }

        const ratingAvg = document.getElementById('modal-rating-avg');
        if (ratingAvg) ratingAvg.textContent = (currentUser.rating_avg || 0).toFixed(1);

        const ratingCount = document.getElementById('modal-rating-count');
        if (ratingCount) ratingCount.textContent = currentUser.rating_count || 0;
    });

    document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
        document.getElementById('profile-modal')?.classList.add('hidden');

        const obFname = document.getElementById('ob-fname');
        const obLname = document.getElementById('ob-lname');
        const obMname = document.getElementById('ob-mname');
        const obMobile = document.getElementById('ob-mobile');
        const obHostel = document.getElementById('ob-hostel');
        const obBlock = document.getElementById('ob-block');
        const obRoom = document.getElementById('ob-room');

        if (obFname) obFname.value = currentUser.firstName || '';
        if (obLname) obLname.value = currentUser.lastName || '';
        if (obMname) obMname.value = currentUser.middleName || '';
        if (obMobile) obMobile.value = currentUser.mobileNumber || '';
        if (obHostel) obHostel.value = currentUser.hostelName || '';
        if (obBlock) obBlock.value = currentUser.hostelBlock || '';
        if (obRoom) obRoom.value = currentUser.roomNumber || '';

        const h2 = document.querySelector('#onboarding-view h2');
        const p = document.querySelector('#onboarding-view p');
        const backBtn = document.getElementById('ob-back-btn');
        if (h2) h2.textContent = 'Edit Profile';
        if (p) p.textContent = 'Update your personal details below.';
        if (backBtn) backBtn.textContent = 'Cancel';

        const obCurrentPic = document.getElementById('ob-current-pic');
        const obRemovePicContainer = document.getElementById('ob-remove-pic-container');
        const obRemovePic = document.getElementById('ob-remove-pic');

        if (currentUser.profilePic) {
            if (obCurrentPic) {
                obCurrentPic.src = `/api${currentUser.profilePic}`;
                obCurrentPic.classList.remove('hidden');
            }
            obRemovePicContainer?.classList.remove('hidden');
            if (obRemovePic) obRemovePic.checked = false;
        } else {
            obCurrentPic?.classList.add('hidden');
            obRemovePicContainer?.classList.add('hidden');
        }

        switchView('onboarding');
    });

    document.getElementById('close-profile-modal')?.addEventListener('click', () => {
        document.getElementById('profile-modal')?.classList.add('hidden');
    });

    // --- Dashboard Logic ---
    window.allProducts = [];

    const renderProducts = () => {
        const container = document.getElementById('product-list');
        if (!container) return;
        container.innerHTML = '';

        if (window.allProducts.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500 font-medium bg-white rounded-2xl border border-gray-100 shadow-sm">No items found matching your filters.</div>`;
            return;
        }

        // FIX: was using assignment (=) instead of strict equality (===) in comparison
        let filteredProducts = window.allProducts;
        if (activeDashTab === 'watchlist') {
            filteredProducts = window.allProducts.filter(p => currentUser.watchlist?.includes(p._id));
        } else if (activeDashTab === 'my-listings') {
            filteredProducts = window.allProducts.filter(p => p.seller && p.seller._id === currentUser._id);
        }

        filteredProducts.forEach((p, idx) => {
            const el = document.createElement('div');
            el.className = `card p-6 shadow-sm border border-gray-100 flex flex-col justify-between animate-fade-in animate-delay-${(idx % 3) + 1}`;

            const isWatched = currentUser.watchlist?.includes(p._id);
            const watchlistHtml = p.seller?._id !== currentUser._id ? `
      <button class="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm hover:scale-110 transition toggle-watchlist-btn" data-id="${p._id}">
        <svg class="w-5 h-5 ${isWatched ? 'fill-red-500 text-red-500' : 'text-gray-400'}" fill="${isWatched ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
      </button>
    ` : '';

            const imageHtml = `
      <div class="relative w-full h-40 mb-4 overflow-hidden rounded-xl bg-gray-100">
        ${p.image && p.image !== 'placeholder.jpg'
                    ? `<img src="/api${p.image}" class="w-full h-full object-cover" />`
                    : `<div class="w-full h-full flex items-center justify-center text-gray-400">Image</div>`}
        ${watchlistHtml}
      </div>
    `;

            // FIX: removed spaces around = in template literal interpolation
            const sellerPic = p.seller && (p.seller.profilePic ? `/api${p.seller.profilePic}` : `https://ui-avatars.com/api/?name=${p.seller?.firstName || p.seller?.username}&background=random`);
            const sellerHtml = `
      <div class="flex items-center gap-2 mb-3 mt-2 pb-3 border-b border-gray-100">
        <img src="${sellerPic}" class="w-6 h-6 rounded-full object-cover shrink-0 bg-white border border-gray-200">
        <p class="text-xs text-gray-500 font-medium truncate flex-1">@${p.seller?.username || 'unknown'}</p>
      </div>
    `;

            const catLabel = p.category ? `<span class="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-800 rounded-md uppercase tracking-wider mr-2">${p.category}</span>` : '';

            el.innerHTML = `
      <div>
        ${imageHtml}
        ${sellerHtml}
        <h3 class="font-bold text-xl mb-2 leading-tight break-words">
            ${p.title}
        </h3>

        <div class="flex flex-wrap gap-2 mb-2">
            ${catLabel}
            <span class="text-[10px] font-bold px-2 py-1 bg-${p.status === 'active' ? 'green' : 'red'}-100 text-${p.status === 'active' ? 'green' : 'red'}-800 rounded-md uppercase tracking-wider">
                ${p.status}
            </span>
        </div>
        <p class="text-gray-500 text-sm line-clamp-2 mb-4 h-10">${p.description || ''}</p>
      </div>
      <div>
        ${p.listingType === 'barter' ? `
          <div class="flex flex-col mb-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 h-16 justify-center">
            <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Looking for</span>
            <span class="text-sm font-semibold text-gray-800 line-clamp-1">${p.targetTrade || 'Open to offers'}</span>
          </div>
          <button class="w-full btn-secondary py-3 text-sm view-product-btn border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-bold tracking-wide" data-id="${p._id}">View Trade</button>
        ` : `
          <div class="flex justify-between items-end mb-2 h-16 pb-2">
            <p class="text-accent font-mono font-bold text-2xl">₹${p.currentPrice || p.basePrice}</p>
            <span class="text-sm font-mono text-gray-500 font-semibold bg-gray-100 px-2 py-1 rounded dash-timer" data-endtime="${p.endTime}">--:--:--:--</span>
          </div>
          <button class="w-full btn-secondary py-3 text-sm view-product-btn" data-id="${p._id}">View & Bid</button>
        `}
      </div>
    `;
            container.appendChild(el);
        });

        document.querySelectorAll('.view-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openProduct(e.target.dataset.id));
        });
    };

    const loadProducts = async () => {
        try {
            const search = document.getElementById('search-input')?.value.trim();
            const category = document.getElementById('filter-category')?.value;
            const minPrice = document.getElementById('filter-min-price')?.value;
            const maxPrice = document.getElementById('filter-max-price')?.value;
            const sortBy = document.getElementById('filter-sort')?.value;

            const params = new URLSearchParams();
            params.append('listingType', activeDashMode);
            if (search) params.append('search', search);
            if (category) params.append('category', category);
            if (minPrice) params.append('minPrice', minPrice);
            if (maxPrice) params.append('maxPrice', maxPrice);
            if (sortBy) params.append('sortBy', sortBy);

            window.allProducts = await apiFetch(`/products?${params.toString()}`);
            renderProducts();
        } catch (err) {
            showToast('Failed to load products');
        }
    };

    let loadTimeout;
    const debouncedLoadProducts = () => {
        clearTimeout(loadTimeout);
        loadTimeout = setTimeout(loadProducts, 300);
    };

    document.getElementById('search-input')?.addEventListener('input', debouncedLoadProducts);
    document.getElementById('filter-min-price')?.addEventListener('input', debouncedLoadProducts);
    document.getElementById('filter-max-price')?.addEventListener('input', debouncedLoadProducts);
    document.getElementById('filter-category')?.addEventListener('change', loadProducts);
    document.getElementById('filter-sort')?.addEventListener('change', loadProducts);

    document.getElementById('filter-toggle-btn')?.addEventListener('click', () => {
        document.getElementById('filter-panel')?.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        const panel = document.getElementById('filter-panel');
        const toggleBtn = document.getElementById('filter-toggle-btn');
        if (panel && toggleBtn && !panel.classList.contains('hidden') && !panel.contains(e.target) && !toggleBtn.contains(e.target)) {
            panel.classList.add('hidden');
        }

        const miniCard = document.getElementById('mini-profile-card');
        if (miniCard && !miniCard.classList.contains('hidden') && !miniCard.contains(e.target) && !e.target.closest('.user-name-clickable')) {
            miniCard.classList.add('hidden');
        }
    });

    document.getElementById('create-listing-btn')?.addEventListener('click', () => {
        document.getElementById('create-modal')?.classList.remove('hidden');
    });

    document.getElementById('close-modal-btn')?.addEventListener('click', () => {
        document.getElementById('create-modal')?.classList.add('hidden');
    });

    document.querySelectorAll('input[name="listingType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const type = e.target.value;
            const prodPrice = document.getElementById('prod-price');
            const prodDuration = document.getElementById('prod-duration');
            const prodTargetTrade = document.getElementById('prod-target-trade');
            const dDays = document.getElementById('prod-duration-days');
            const dHours = document.getElementById('prod-duration-hours');
            const dMins = document.getElementById('prod-duration-minutes');

            if (type === 'barter') {
                prodPrice?.classList.add('hidden');
                prodDuration?.classList.add('hidden');
                prodTargetTrade?.classList.remove('hidden');
                prodPrice?.removeAttribute('required');
                dDays?.removeAttribute('required');
                dHours?.removeAttribute('required');
                dMins?.removeAttribute('required');
                prodTargetTrade?.setAttribute('required', 'true');
            } else {
                prodPrice?.classList.remove('hidden');
                prodDuration?.classList.remove('hidden');
                prodTargetTrade?.classList.add('hidden');
                prodPrice?.setAttribute('required', 'true');
                dDays?.setAttribute('required', 'true');
                dHours?.setAttribute('required', 'true');
                dMins?.setAttribute('required', 'true');
                prodTargetTrade?.removeAttribute('required');
            }
        });
    });

    document.getElementById('create-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const listingType = document.querySelector('input[name="listingType"]:checked')?.value;
        const title = document.getElementById('prod-title')?.value;
        const description = document.getElementById('prod-desc')?.value;
        const category = document.getElementById('prod-category')?.value;
        const basePrice = document.getElementById('prod-price')?.value;
        const daysInput = document.getElementById('prod-duration-days');
        const hoursInput = document.getElementById('prod-duration-hours');
        const minutesInput = document.getElementById('prod-duration-minutes');
        let days = parseInt(daysInput?.value || '0', 10);
        let hours = parseInt(hoursInput?.value || '0', 10);
        let minutes = parseInt(minutesInput?.value || '0', 10);

        // ✅ SAFETY LIMITS
        if (hours > 24) hours = 24;
        if (minutes > 60) minutes = 60;
        if (days < 0) days = 0;
        if (hours < 0) hours = 0;
        if (minutes < 0) minutes = 0;
        const targetTrade = document.getElementById('prod-target-trade')?.value;
        const imageFile = document.getElementById('prod-image')?.files[0];
        
        if (!title || title.trim() === '' || !category) {
            showToast('Please fill all mandatory fields (title, category).', true);
            return;
        }
        if (!imageFile) {
            showToast('Please upload an image.', true);
            return;
        }

        const formData = new FormData();
        formData.append('listingType', listingType);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);

        if (listingType === 'barter') {
            if (!targetTrade || targetTrade.trim() === '') {
                showToast('Target trade is required for barter listings.', true);
                return;
            }
            formData.append('targetTrade', targetTrade);
        } else {
            const durationMs = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
            if (!basePrice || durationMs <= 0) {
                showToast('Base price and valid duration are required for auctions.', true);
                return;
            }
            formData.append('basePrice', basePrice);
            formData.append('durationMs', durationMs);
        }

        formData.append('image', imageFile);

        try {
            const headers = {};
            if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

            const response = await fetch('/api/products', {
                method: 'POST',
                headers,
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'API Error');

            showToast('Listing created successfully!');
            document.getElementById('create-modal')?.classList.add('hidden');
            document.getElementById('create-form')?.reset();
            loadProducts();

        } catch (err) {
            showToast(err.message);
        }
    });
    const daysInput = document.getElementById('prod-duration-days');
    const hoursInput = document.getElementById('prod-duration-hours');
    const minutesInput = document.getElementById('prod-duration-minutes');

    daysInput?.addEventListener('input', () => {
        if (daysInput.value < 0) daysInput.value = 0;
    });

    hoursInput?.addEventListener('input', () => {
        if (hoursInput.value > 24) hoursInput.value = 24;
        if (hoursInput.value < 0) hoursInput.value = 0;
    });

    minutesInput?.addEventListener('input', () => {
        if (minutesInput.value > 60) minutesInput.value = 60;
        if (minutesInput.value < 0) minutesInput.value = 0;
    });

    // --- Edit Product Logic ---
    document.getElementById('edit-product-btn')?.addEventListener('click', () => {
        if (!currentProduct) return;
        const editTitle = document.getElementById('edit-prod-title');
        const editDesc = document.getElementById('edit-prod-desc');
        const editCat = document.getElementById('edit-prod-category');
        if (editTitle) editTitle.value = currentProduct.title;
        if (editDesc) editDesc.value = currentProduct.description || '';
        if (editCat) editCat.value = currentProduct.category || '';
        document.getElementById('edit-product-modal')?.classList.remove('hidden');
    });

    document.getElementById('close-edit-modal-btn')?.addEventListener('click', () => {
        document.getElementById('edit-product-modal')?.classList.add('hidden');
    });

    document.getElementById('edit-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentProduct) return;

        const title = document.getElementById('edit-prod-title')?.value;
        const description = document.getElementById('edit-prod-desc')?.value;
        const category = document.getElementById('edit-prod-category')?.value;

        try {
            const response = await fetch(`/api/products/${currentProduct._id}/details`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ title, description, category })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'API Error');

            showToast('Product details updated!');
            document.getElementById('edit-product-modal')?.classList.add('hidden');

            currentProduct.title = data.title;
            currentProduct.description = data.description;
            currentProduct.category = data.category;

            const detailTitle = document.getElementById('detail-title');
            if (detailTitle) detailTitle.textContent = currentProduct.title;
            const detailDesc = document.getElementById('detail-desc');
            if (detailDesc) detailDesc.textContent = currentProduct.description;

            const dashProd = window.allProducts.find(p => p._id === currentProduct._id);
            if (dashProd) {
                dashProd.title = data.title;
                dashProd.description = data.description;
                dashProd.category = data.category;
            }
        } catch (err) {
            showToast(err.message);
        }
    });

    // --- Product Details & Bidding Logic ---
    document.getElementById('back-to-dash')?.addEventListener('click', () => {
        if (currentProduct) {
            socket.emit('leave_product_room', currentProduct._id);
            currentProduct = null;
        }
        switchView('dashboard');
        loadProducts();
    });

    const openProduct = async (id) => {
        try {
            const product = await apiFetch(`/products/${id}`);
            currentProduct = product;

            const detailTitle = document.getElementById('detail-title');
            if (detailTitle) detailTitle.textContent = product.title;

            const sellerFullName = `${product.seller.firstName || ''} ${product.seller.lastName || ''}`.trim() || product.seller.username;
            const detailSellerName = document.getElementById('detail-seller-name');
            if (detailSellerName) detailSellerName.textContent = sellerFullName;

            const detailSellerUsername = document.getElementById('detail-seller-username');
            if (detailSellerUsername) detailSellerUsername.textContent = `@${product.seller.username}`;

            const defaultAvatar = `https://ui-avatars.com/api/?name=${product.seller.firstName || product.seller.username}&background=random`;
            const sellerPicEl = document.getElementById('detail-seller-pic');
            if (sellerPicEl) {
                sellerPicEl.src = product.seller.profilePic ? `/api${product.seller.profilePic}` : defaultAvatar;
                sellerPicEl.classList.add('cursor-pointer', 'hover:border-accent', 'transition-all');
                sellerPicEl.onclick = (e) => {
                    e.stopPropagation();
                    showMiniProfile(product.seller._id, e.clientX, e.clientY);
                };
            }

            const detailEnds = document.getElementById('detail-ends');
            if (detailEnds) detailEnds.textContent = new Date(product.endTime).toLocaleDateString();

            const detailDesc = document.getElementById('detail-desc');
            if (detailDesc) detailDesc.textContent = product.description;

            const timerElem = document.getElementById('detail-timer');
            if (timerElem) timerElem.setAttribute('data-endtime', product.endTime);

            const imgElem = document.getElementById('detail-image');
            const placeholder = document.getElementById('detail-image-placeholder');
            if (product.image && product.image !== 'placeholder.jpg') {
                if (imgElem) { imgElem.src = `/api${product.image}`; imgElem.classList.remove('hidden'); }
                placeholder?.classList.add('hidden');
            } else {
                imgElem?.classList.add('hidden');
                placeholder?.classList.remove('hidden');
            }

            const priceDisplay = document.getElementById('detail-price');
            const basePriceDisplay = document.getElementById('detail-base-price');
            const historyContainer = document.getElementById('bid-history-container');
            const bidForm = document.getElementById('bid-form');

            if (product.listingType === 'barter') {
                priceDisplay?.classList.add('hidden');
                basePriceDisplay?.classList.add('hidden');
                timerElem?.classList.add('hidden');
                historyContainer?.classList.add('hidden');
                bidForm?.classList.add('hidden');

                if (detailDesc) {
                    detailDesc.innerHTML = `
          ${product.description}
          <div class="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <p class="font-bold text-emerald-800 text-sm uppercase tracking-wide mb-1">Looking for Trade:</p>
            <p class="text-gray-800 font-medium">${product.targetTrade || 'Open to offers'}</p>
          </div>
        `;
                }
            } else {
                priceDisplay?.classList.remove('hidden');
                basePriceDisplay?.classList.remove('hidden');
                timerElem?.classList.remove('hidden');

                if (priceDisplay) {
                    priceDisplay.textContent = `₹${product.currentPrice || product.basePrice}`;
                    priceDisplay.classList.add('flash-highlight');
                    setTimeout(() => priceDisplay.classList.remove('flash-highlight'), 1500);
                }

                if (basePriceDisplay) basePriceDisplay.textContent = `Base: ₹${product.basePrice}`;

                if (product.bids && product.bids.length > 0) {
                    historyContainer?.classList.remove('hidden');
                    const historyList = document.getElementById('bid-history');
                    if (historyList) {
                        historyList.innerHTML = product.bids.sort((a, b) => b.amount - a.amount).map(b => `
            <li class="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
              <span class="font-medium text-gray-700">${b.bidder?.username || 'Unknown'}</span>
              <span class="font-mono font-bold text-accent">₹${b.amount}${b.amount === product.basePrice ? ' (base)' : ''}</span>
            </li>
          `).join('');
                    }
                } else {
                    historyContainer?.classList.add('hidden');
                    const historyList = document.getElementById('bid-history');
                    if (historyList) historyList.innerHTML = '';
                }

                if (product.status === 'sold' || product.seller._id === currentUser._id) {
                    bidForm?.classList.add('hidden');
                } else {
                    bidForm?.classList.remove('hidden');
                }
            }

            const statusEl = document.getElementById('detail-status');
            if (statusEl) {
                statusEl.textContent = product.status.toUpperCase();
                if (product.status === 'sold') {
                    statusEl.className = 'px-4 py-1.5 bg-red-100 text-red-800 rounded-full text-sm font-bold tracking-wide';
                    if (detailSellerUsername) detailSellerUsername.textContent = `@${product.seller.username} (Sold to: ${product.finalBuyer?.username || 'Unknown'})`;
                } else {
                    statusEl.className = 'px-4 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-bold tracking-wide';
                }
            }

            const sellerControls = document.getElementById('seller-controls');
            const editProductBtn = document.getElementById('edit-product-btn');
            const imageUploadOverlay = document.getElementById('image-upload-overlay');
            const finishBtn = document.getElementById('finish-bidding-btn');

            if (product.seller._id === currentUser._id && product.status === 'active') {
                sellerControls?.classList.remove('hidden');
                editProductBtn?.classList.remove('hidden');
                if (finishBtn) {
                    finishBtn.textContent = product.listingType === 'barter' ? "End Trade" : "End Bidding Now";
                }
            } else {
                sellerControls?.classList.add('hidden');
                editProductBtn?.classList.add('hidden');
            }

            if (product.seller._id === currentUser._id) {
                imageUploadOverlay?.classList.remove('hidden');
                imageUploadOverlay?.classList.add('flex');
            } else {
                imageUploadOverlay?.classList.add('hidden');
                imageUploadOverlay?.classList.remove('flex');
            }

            socket.emit('join_product_room', product._id);

            const groupChatTab = document.querySelector('.chat-tab[data-target="group"]');
            if (product.listingType === 'barter' && product.seller._id !== currentUser._id) {
                activeChatTab = 'private';
                groupChatTab?.classList.add('hidden');
            } else {
                activeChatTab = 'group';
                groupChatTab?.classList.remove('hidden');
            }

            activeBuyerChat = null;
            document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('text-accent', 'border-accent'));
            document.querySelector(`.chat-tab[data-target="${activeChatTab}"]`)?.classList.add('text-accent', 'border-accent');

            // Remove old propose-trade-btn if exists
            const oldBtn = document.getElementById('propose-trade-btn');
            if (oldBtn) oldBtn.remove();

            if (product.listingType === 'barter' && product.seller._id !== currentUser._id) {
                const chatFormEl = document.getElementById('chat-form');
                chatFormEl?.insertAdjacentHTML('beforebegin', `
        <button id="propose-trade-btn" class="w-full bg-emerald-100 text-emerald-800 font-bold py-2 mb-2 rounded-xl border border-emerald-200 hover:bg-emerald-200 transition">
          Propose a Trade Offer
        </button>
      `);
            }

            loadMessages();

            const privateTabBtn = document.getElementById('private-tab-btn');
            if (privateTabBtn) {
                if (product.seller._id === currentUser._id) {
                    privateTabBtn.textContent = "Interested Buyers";
                } else {
                    privateTabBtn.textContent = product.listingType === 'barter' ? "Negotiate Trade" : "Private Message";
                }
            }

            socket.emit('identify', currentUser._id);
            switchView('product');
        } catch (err) {
            showToast(err.message);
        }
    };

    document.getElementById('bid-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentProduct) return;
        const amountObj = document.getElementById('bid-amount');
        const amount = Number(amountObj?.value);

        if (!amount) return;

        socket.emit('place_bid', {
            productId: currentProduct._id,
            bidderId: currentUser._id,
            username: currentUser.username,
            amount
        });
        if (amountObj) amountObj.value = '';
    });

    // Socket Bid Events
    socket.on('new_bid', (data) => {
        // Update allProducts so dashboard card shows correct price when user navigates back
        const prodInList = window.allProducts.find(p => String(p._id) === String(data.productId));
        if (prodInList) prodInList.currentPrice = data.amount;

        // FIX: was comparing currentProduct._id to itself (always true), should check data.productId
        if (currentProduct && String(currentProduct._id) === String(data.productId)) {
            console.log("SOCKET RECEIVED:", data);
            currentProduct.currentPrice = data.amount;
            const priceEl = document.getElementById('detail-price');
            if (priceEl) {
                priceEl.textContent = `₹${data.amount}`;
                priceEl.classList.add('text-red-500');
                setTimeout(() => priceEl.classList.remove('text-red-500'), 500);
            }
            const priceDisplay = document.getElementById('detail-price');
            if (priceDisplay) {
                priceDisplay.textContent = `₹${data.amount}`;
                priceDisplay.classList.add('flash-highlight');
                setTimeout(() => priceDisplay.classList.remove('flash-highlight'), 1500);
            }

            const historyContainer = document.getElementById('bid-history-container');
            const historyList = document.getElementById('bid-history');
            historyContainer?.classList.remove('hidden');
            if (historyList) {
                const newBidItem = document.createElement('li');
                newBidItem.className = 'flex justify-between items-center text-sm border-b border-gray-100 pb-2 animate-fade-in';
                newBidItem.innerHTML = `<span class="font-medium text-gray-700">${data.bidder}</span><span class="font-mono font-bold text-accent">₹${data.amount}</span>`;
                historyList.prepend(newBidItem);
            }

            showToast(`New bid: ₹${data.amount} by ${data.bidder}`);
        }
    });

    socket.on('bid_error', (data) => {
        showToast('Bid Failed: ' + data.message);
    });

    document.getElementById('finish-bidding-btn')?.addEventListener('click', async () => {
        if (!currentProduct) return;
        try {
            await apiFetch(`/products/${currentProduct._id}/finish`, { method: 'POST' });
            showToast('Bidding Ended!');
            openProduct(currentProduct._id);
        } catch (err) {
            showToast(err.message);
        }
    });

    document.getElementById('delete-listing-btn')?.addEventListener('click', async () => {
        if (!currentProduct) return;
        if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;

        try {
            await apiFetch(`/products/${currentProduct._id}`, { method: 'DELETE' });
            showToast('Listing deleted successfully');

            socket.emit('leave_product_room', currentProduct._id);
            currentProduct = null;
            switchView('dashboard');
            loadProducts();
        } catch (err) {
            showToast(err.message);
        }
    });

    document.getElementById('change-image-input')?.addEventListener('change', async (e) => {
        if (!e.target.files.length || !currentProduct) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('image', file);

        try {
            const headers = {};
            if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

            const res = await fetch(`/api/products/${currentProduct._id}/image`, {
                method: 'POST',
                headers,
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');

            const imgElem = document.getElementById('detail-image');
            const placeholder = document.getElementById('detail-image-placeholder');
            if (imgElem) {
                imgElem.src = `/api${data.image}`;
                imgElem.classList.remove('hidden');
            }
            placeholder?.classList.add('hidden');

            currentProduct.image = data.image;
            showToast('Image updated successfully');
        } catch (err) {
            showToast(err.message);
        }
    });

    // --- Chat Logic ---
    let allMessages = [];

    const loadMessages = async () => {
        if (!currentProduct) return;
        try {
            allMessages = await apiFetch(`/chats/${currentProduct._id}`);
            renderMessages();
        } catch (err) {
            console.error(err);
        }
    };

    const getObjectIdAsString = (obj) => {
        if (!obj) return null;
        const id = typeof obj === 'object' ? (obj._id || null) : obj;
        return id ? String(id) : null;
    };

    const showMiniProfile = async (userId, x, y) => {
        const card = document.getElementById('mini-profile-card');
        if (!card) return;
        try {
            const user = await apiFetch(`/auth/profile/${userId}`);

            const miniCardName = document.getElementById('mini-card-name');
            if (miniCardName) miniCardName.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;

            const miniCardUsername = document.getElementById('mini-card-username');
            if (miniCardUsername) miniCardUsername.textContent = `@${user.username}`;

            const defaultAvatar = `https://ui-avatars.com/api/?name=${user.firstName || user.username}&background=random`;
            const miniCardPic = document.getElementById('mini-card-pic');
            if (miniCardPic) miniCardPic.src = user.profilePic ? `/api${user.profilePic}` : defaultAvatar;

            const hostel = user.hostelName || '';
            const block = user.hostelBlock || '';
            const room = user.roomNumber || '';
            const address = `${hostel}${block ? ', ' + block : ''}${room ? '-' + room : ''}`;

            const miniCardHostel = document.getElementById('mini-card-hostel');
            if (miniCardHostel) miniCardHostel.textContent = address || 'N/A';

            const miniCardRoom = document.getElementById('mini-card-room');
            if (miniCardRoom) miniCardRoom.textContent = '';

            const miniCardMobile = document.getElementById('mini-card-mobile');
            if (miniCardMobile) miniCardMobile.textContent = user.mobileNumber || 'N/A';

            const cardWidth = 256;
            const posX = Math.min(window.innerWidth - cardWidth - 20, x);
            const posY = Math.min(window.innerHeight - 200, y);

            card.style.left = `${posX}px`;
            card.style.top = `${posY}px`;
            card.classList.remove('hidden');
        } catch (err) {
            showToast('Failed to load user info');
        }
    };

    window.respondTrade = (messageId, status, productId) => {
        socket.emit('respond_trade_offer', { messageId, responseStatus: status, productId });
    };

    document.addEventListener('click', (e) => {
        if (e.target.id === 'propose-trade-btn') {
            const desc = prompt('What are you offering in exchange?');
            if (!desc) return;
            const amountStr = prompt('Any additional cash? (Leave blank if none)');
            const amount = Number(amountStr) || 0;

            const recipientId = activeBuyerChat
                ? activeBuyerChat._id
                : (currentProduct?.seller._id === currentUser._id ? null : currentProduct?.seller._id);

            socket.emit('send_trade_offer', {
                productId: currentProduct._id,
                senderId: currentUser._id,
                username: currentUser.username,
                description: desc,
                cashAmount: amount,
                recipientId,
                recipientUsername: 'User'
            });
        }
    });

    const renderSingleMessage = (m, container) => {
        const myId = getObjectIdAsString(currentUser);
        const senderId = getObjectIdAsString(m.sender);
        const isMine = senderId === myId;
        const alignClass = isMine ? 'justify-end' : 'justify-start';
        const bubbleClass = isMine ? 'bg-accent text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none';

        let textToDisplay = m.text;
        const sellerId = getObjectIdAsString(currentProduct?.seller);

        if (m.offer) {
            let actionButtons = '';
            if (m.offer.status === 'pending' && sellerId === myId && senderId !== myId) {
                actionButtons = `
        <div class="flex gap-2 shrink-0">
          <button class="bg-red-500 hover:bg-red-600 text-white text-[10px] px-2 py-1 rounded transition whitespace-nowrap shadow border-none" onclick="respondTrade('${m._id}', 'rejected', '${currentProduct._id}')">Reject</button>
          <button class="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-2 py-1 rounded transition whitespace-nowrap shadow border-none" onclick="respondTrade('${m._id}', 'accepted', '${currentProduct._id}')">Accept</button>
        </div>
      `;
            }
            textToDisplay = `
      <div class="trade-card ${m.offer.status} text-left min-w-[200px]">
        <p class="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-1">Trade Proposal</p>
        <p class="font-bold text-gray-800 text-sm leading-tight">${m.offer.description}</p>
        ${m.offer.cashAmount ? `<p class="font-mono text-emerald-600 font-bold mt-1 text-sm">+ ₹${m.offer.cashAmount}</p>` : ''}
        <div class="mt-3 flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-white rounded shadow-sm opacity-80 text-gray-600">${m.offer.status}</span>
          ${actionButtons}
        </div>
      </div>
    `;
        }

        const el = document.createElement('div');
        el.className = `flex ${alignClass} mb-3 animate-fade-in`;
        const senderName = m.sender && m.sender.username ? m.sender.username : 'User';

        const nameHtml = !isMine && activeChatTab === 'group'
            ? `<div class="text-xs text-gray-400 ml-1 mb-1 font-medium user-name-clickable" data-userid="${senderId}">${senderName}</div>`
            : (!isMine ? `<div class="text-xs text-gray-400 ml-1 mb-1 font-medium">${senderName}</div>` : '');

        el.innerHTML = `
    <div class="max-w-[80%]">
      ${nameHtml}
      <div class="px-4 py-2 rounded-2xl ${bubbleClass} shadow-sm text-sm break-words whitespace-pre-wrap">${textToDisplay}</div>
    </div>
  `;

        if (!isMine && activeChatTab === 'group') {
            const nameNode = el.querySelector('.user-name-clickable');
            if (nameNode) {
                nameNode.addEventListener('click', (e) => {
                    const uid = nameNode.dataset.userid;
                    showMiniProfile(uid, e.clientX, e.clientY);
                });
            }
        }

        container.appendChild(el);
    };

    const renderMessages = () => {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        container.innerHTML = '';

        if (activeChatTab === 'private') {
            const isSeller = currentProduct?.seller._id === currentUser._id;

            if (isSeller && !activeBuyerChat) {
                const privateMsgs = allMessages.filter(m => m.isPrivate);
                const buyersMap = new Map();

                privateMsgs.forEach(m => {
                    const sId = getObjectIdAsString(m.sender);
                    const rId = getObjectIdAsString(m.recipient);
                    const myId = getObjectIdAsString(currentUser);
                    const otherParty = sId === myId ? m.recipient : m.sender;

                    if (otherParty) {
                        const otherId = getObjectIdAsString(otherParty);
                        if (otherId && otherId !== myId) {
                            buyersMap.set(otherId, {
                                _id: otherId,
                                username: otherParty.username,
                                firstName: otherParty.firstName,
                                lastName: otherParty.lastName,
                                profilePic: otherParty.profilePic
                            });
                        }
                    }
                });

                if (buyersMap.size === 0) {
                    container.innerHTML = `<div class="text-center text-gray-400 py-10 text-sm font-medium">No private messages yet.</div>`;
                    document.getElementById('chat-form')?.classList.add('hidden');
                    return;
                }

                container.innerHTML = `<div class="font-bold text-gray-500 mb-4 px-2 uppercase text-xs tracking-widest">Buyer Conversations</div>`;
                buyersMap.forEach((buyer) => {
                    const el = document.createElement('div');
                    el.className = `p-3 mb-3 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-accent transition flex items-center gap-4 group`;

                    const defaultAvatar = `https://ui-avatars.com/api/?name=${buyer.firstName || buyer.username}&background=random`;
                    const picUrl = buyer.profilePic ? `/api${buyer.profilePic}` : defaultAvatar;

                    el.innerHTML = `
          <img src="${picUrl}" class="w-12 h-12 rounded-full object-cover border-2 border-gray-50 chat-list-avatar" data-userid="${buyer._id}">
          <div class="flex-1 min-w-0">
            <div class="font-bold text-gray-800 truncate">${(`${buyer.firstName || ''} ${buyer.lastName || ''}`).trim() || buyer.username}</div>
            <div class="text-xs text-gray-400 font-medium">@${buyer.username}</div>
          </div>
          <div class="text-accent opacity-0 group-hover:opacity-100 transition text-xs font-bold whitespace-nowrap">Open &rarr;</div>
        `;

                    el.addEventListener('click', (e) => {
                        if (e.target.classList.contains('chat-list-avatar')) {
                            showMiniProfile(buyer._id, e.clientX, e.clientY);
                            return;
                        }
                        activeBuyerChat = buyer;
                        renderMessages();
                    });
                    container.appendChild(el);
                });

                document.getElementById('chat-form')?.classList.add('hidden');
                return;
            }

            document.getElementById('chat-form')?.classList.remove('hidden');

            let threadMessages = [];

            if (isSeller) {
                threadMessages = allMessages.filter(m => {
                    if (!m.isPrivate) return false;
                    const sId = getObjectIdAsString(m.sender);
                    const rId = getObjectIdAsString(m.recipient);
                    const activeId = getObjectIdAsString(activeBuyerChat);
                    return sId === activeId || rId === activeId;
                });

                const backBtn = document.createElement('button');
                backBtn.className = 'text-xs font-bold text-gray-500 hover:text-accent mb-6 flex items-center gap-2 transition bg-gray-100 px-3 py-1.5 rounded-lg';
                backBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg> Back to Buyers List`;
                backBtn.addEventListener('click', () => {
                    activeBuyerChat = null;
                    renderMessages();
                });
                container.appendChild(backBtn);
            } else {
                threadMessages = allMessages.filter(m => {
                    if (!m.isPrivate) return false;
                    const sId = getObjectIdAsString(m.sender);
                    const rId = getObjectIdAsString(m.recipient);
                    const myId = getObjectIdAsString(currentUser);
                    return sId === myId || rId === myId;
                });
            }

            threadMessages.forEach(m => renderSingleMessage(m, container));
        } else {
            document.getElementById('chat-form')?.classList.remove('hidden');
            const groupMsgs = allMessages.filter(m => !m.isPrivate);
            groupMsgs.forEach(m => renderSingleMessage(m, container));
        }

        container.scrollTop = container.scrollHeight;
    };

    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.chat-tab').forEach(t => {
                t.classList.remove('text-accent', 'border-accent');
                t.classList.add('text-gray-400', 'border-transparent');
            });
            e.target.classList.remove('text-gray-400', 'border-transparent');
            e.target.classList.add('text-accent', 'border-accent');
            activeChatTab = e.target.dataset.target;
            if (activeChatTab === 'group') activeBuyerChat = null;
            renderMessages();
        });
    });

    document.getElementById('chat-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const rawText = input?.value.trim();
        if (!rawText || !currentProduct) return;

        const isPrivate = activeChatTab === 'private';
        let recipientId = null;
        let recipientUsername = null;

        if (isPrivate) {
            const isSeller = currentProduct.seller._id === currentUser._id;
            if (isSeller) {
                if (!activeBuyerChat) return;
                recipientId = activeBuyerChat._id;
                recipientUsername = activeBuyerChat.username;
            } else {
                recipientId = currentProduct.seller._id;
                recipientUsername = currentProduct.seller.username;
            }
        }

        socket.emit('send_message', {
            productId: currentProduct._id,
            senderId: currentUser._id,
            username: currentUser.username,
            text: rawText,
            isPrivate,
            recipientId,
            recipientUsername
        });

        if (input) input.value = '';
    });

    socket.on('receive_message', (data) => {
        allMessages.push(data);
        renderMessages();
    });

    socket.on('offer_updated', (data) => {
        const msg = allMessages.find(m => m._id === data.messageId);
        if (msg && msg.offer) {
            msg.offer.status = data.status;
            renderMessages();
        } else {
            loadMessages();
        }
    });

    socket.on('trade_accepted', (data) => {
        if (currentProduct && currentProduct._id === data.productId) {
            currentProduct.status = 'sold';
            currentProduct.finalBuyer = data.finalBuyer;
            openProduct(currentProduct._id);
            showToast('Trade successfully accepted!');
        }
    });

    socket.on('connect', () => {
        if (currentProduct) {
            socket.emit('join_product_room', currentProduct._id);
        }
    });

    socket.on('notification', (data) => {
        showToast(`${data.message}`);
    });

    if (currentUser) {
        socket.emit('identify', currentUser._id);
    }

    // Dashboard Mode Buttons
    document.querySelectorAll('.dash-mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget;
            activeDashMode = targetBtn.dataset.mode;
            document.querySelectorAll('.dash-mode-btn').forEach(b => b.classList.remove('active-mode', 'active'));
            targetBtn.classList.add('active-mode', 'active');
            loadProducts();
        });
    });

    // Dashboard Tabs
    document.querySelectorAll('.dash-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            activeDashTab = e.target.dataset.tab;
            renderProducts();
        });
    });

    // Watchlist Toggle
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.toggle-watchlist-btn');
        if (btn) {
            e.stopPropagation();
            const productId = btn.dataset.id;
            try {
                const data = await apiFetch(`/products/${productId}/watchlist`, { method: 'POST' });
                currentUser.watchlist = data.watchlist;
                localStorage.setItem('user', JSON.stringify(currentUser));
                renderProducts();
                showToast(data.message);
            } catch (err) {
                showToast(err.message);
            }
        }
    });

    // Leaderboard Modal
    document.getElementById('leaderboard-btn')?.addEventListener('click', async () => {
        try {
            const stats = await apiFetch('/products/stats/leaderboard');
            const html = `
      <div class="fixed inset-0 z-[150] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="leaderboard-modal">
        <div class="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl relative max-h-[80vh] overflow-y-auto">
          <button class="absolute top-6 right-6 text-gray-400 hover:text-black font-bold text-xl" onclick="document.getElementById('leaderboard-modal').remove()">&times;</button>
          <h3 class="text-2xl font-bold mb-6 flex items-center gap-2">
            <svg class="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
            Hostel Leaderboard
          </h3>
          <div class="space-y-4">
            ${stats.map((s, i) => `
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div class="flex items-center gap-4">
                  <span class="w-8 h-8 rounded-full flex items-center justify-center font-bold ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'} text-sm">${i + 1}</span>
                  <span class="font-bold text-gray-800">${s._id || 'Unassigned'}</span>
                </div>
                <div class="text-right">
                  <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Ads</p>
                  <p class="text-lg font-black text-accent">${s.activeCount}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (err) {
            showToast(err.message);
        }
    });

    // Timer Global Loop
    const formatDuration = (ms) => {
        if (isNaN(ms) || ms <= 0) return "--:--:--";
        const totalSecs = Math.floor(ms / 1000);
        const d = Math.floor(totalSecs / 86400);
        const h = Math.floor((totalSecs % 86400) / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        return `${d.toString().padStart(2, '0')}:${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatMmSs = (ms) => {
        if (isNaN(ms) || ms <= 0) return "--:--:--";
        const totalSecs = Math.floor(ms / 1000);
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    setInterval(() => {
        const now = Date.now();
        document.querySelectorAll('.dash-timer').forEach(el => {
            const rawEnd = el.getAttribute('data-endtime');
            if (!rawEnd || rawEnd === 'null' || rawEnd === 'undefined') {
                el.textContent = "--:--:--";
                return;
            }
            const end = new Date(rawEnd).getTime();
            if (isNaN(end)) {
                el.textContent = "--:--:--";
                return;
            }
            el.textContent = formatDuration(end - now);
        });

        document.querySelectorAll('.ending-soon-timer').forEach(el => {
            const rawEnd = el.getAttribute('data-endtime');
            if (!rawEnd || rawEnd === 'null' || rawEnd === 'undefined') {
                el.textContent = "--:--:--";
                return;
            }
            const end = new Date(rawEnd).getTime();
            if (isNaN(end)) {
                el.textContent = "--:--:--";
                return;
            }
            const msLeft = end - now;
            el.textContent = formatMmSs(msLeft);
            if (msLeft <= 60000 && msLeft > 0) {
                el.classList.add('text-red-600', 'font-black', 'animate-pulse');
            } else {
                el.classList.remove('text-red-600', 'font-black', 'animate-pulse');
            }
        });

        const detailTimer = document.getElementById('detail-timer');
        if (detailTimer && currentProduct) {
            const rawEnd = detailTimer.getAttribute('data-endtime');
            if (!rawEnd || rawEnd === 'null' || rawEnd === 'undefined') {
                detailTimer.textContent = "--:--:--";
            } else {
                const end = new Date(rawEnd).getTime();
                if (isNaN(end)) {
                    detailTimer.textContent = "--:--:--";
                } else {
                    detailTimer.textContent = formatDuration(end - now);
                }
            }
        }
    }, 1000);

    // Start App
    init();

});