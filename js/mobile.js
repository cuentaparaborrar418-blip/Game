        const joystickZone = document.getElementById('joystick-zone');
        const joystickHandle = document.getElementById('joystick-handle');
        let joystickActive = false;
        let joystickTouchId = null;
        let joystickStart = { x: 0, y: 0 };
        let joystickMove = { x: 0, y: 0 };
        const maxJoystickDist = 50;
        let joystickTouchStartTime = 0;
        let joystickTapTimes = [];

        joystickZone.addEventListener('touchstart', e => {
            if (joystickActive) return;
            const touch = e.changedTouches[0];
            joystickTouchId = touch.identifier;
            joystickActive = true;
            joystickTouchStartTime = Date.now();
            const rect = joystickZone.getBoundingClientRect();
            joystickStart = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }, { passive: true });

        window.addEventListener('touchmove', e => {
            if (!joystickActive) return;
            let activeTouch = null;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === joystickTouchId) { activeTouch = e.touches[i]; break; }
            }
            if (!activeTouch) return;
            const dx = activeTouch.clientX - joystickStart.x;
            const dy = activeTouch.clientY - joystickStart.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= maxJoystickDist) joystickMove = { x: dx, y: dy };
            else {
                const angle = Math.atan2(dy, dx);
                joystickMove = { x: Math.cos(angle) * maxJoystickDist, y: Math.sin(angle) * maxJoystickDist };
            }
            joystickHandle.style.transform = `translate(${joystickMove.x}px, ${joystickMove.y}px)`;
            if (dist > 8) cancelCelebration(player);
        }, { passive: true });

        const endJoystickTouch = (e) => {
            if (!joystickActive) return;
            let ended = false;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === joystickTouchId) { ended = true; break; }
            }
            if (ended) {
                const dragDist = Math.hypot(joystickMove.x, joystickMove.y);
                const duration = Date.now() - joystickTouchStartTime;
                if (duration < 220 && dragDist < 8) {
                    const now = Date.now();
                    joystickTapTimes.push(now);
                    joystickTapTimes = joystickTapTimes.filter(t => now - t < 900);
                    if (joystickTapTimes.length >= 3) {
                        startCelebration(player, true);
                        joystickTapTimes = [];
                    }
                }
                joystickActive = false;
                joystickTouchId = null;
                joystickMove = { x: 0, y: 0 };
                joystickHandle.style.transform = `translate(0px, 0px)`;
            }
        };
        window.addEventListener('touchend', endJoystickTouch);
        window.addEventListener('touchcancel', endJoystickTouch);

        let mobileJumpActive = false;
        const btnMobileJump = document.getElementById('btn-mobile-jump');
        btnMobileJump.addEventListener('touchstart', e => { e.preventDefault(); mobileJumpActive = true; cancelCelebration(player); }, { passive: false });
        btnMobileJump.addEventListener('touchend', e => { e.preventDefault(); mobileJumpActive = false; }, { passive: false });

        const btnMobileItem = document.getElementById('btn-mobile-item');
        btnMobileItem.addEventListener('click', () => useHeldItem(player));
        btnMobileItem.addEventListener('touchstart', e => { e.preventDefault(); useHeldItem(player); }, { passive: false });

        window.addEventListener('touchstart', e => {
            if (!gameActive || currentRole !== 'killer') return;
            const touch = e.changedTouches[0];
            if (touch.clientX > window.innerWidth / 2) {
                const jumpRect = btnMobileJump.getBoundingClientRect();
                if (touch.clientX >= jumpRect.left && touch.clientX <= jumpRect.right &&
                    touch.clientY >= jumpRect.top && touch.clientY <= jumpRect.bottom) return;
                let hitAbility = false;
                (player.abilities || []).forEach(skill => {
                    const sBtn = document.getElementById(`btn-skill-${skill.id}`);
                    if (sBtn) {
                        const sRect = sBtn.getBoundingClientRect();
                        if (touch.clientX >= sRect.left && touch.clientX <= sRect.right &&
                            touch.clientY >= sRect.top && touch.clientY <= sRect.bottom) hitAbility = true;
                    }
                });
                if (!hitAbility) { triggerMeleeStrike(); cancelCelebration(player); }
            }
        }, { passive: true });
