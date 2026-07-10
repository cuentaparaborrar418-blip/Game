        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width || 800;
            canvas.height = rect.height || 600;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const GRAVITY = 0.5;
        let WORLD_WIDTH = 5000;
        let WORLD_HEIGHT = 1000;
        const camera = { x: 0, y: 0 };
        let cameraShake = 0;
        let platforms = [];
        let currentMap = null;


        let particles = [];

        function applyBurnEffect(entity, rate, duration) {
            if (!entity) return;
            entity.burnTimer = duration;
            entity.burnStrength = rate * 0.7;
        }

        function updateParticles() {
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                if (!p) continue;
                p.life--;
                if (p.life <= 0) particles.splice(i, 1);
                else { p.x += p.vx || 0; p.y += p.vy || 0; }
            }
        }


        function handleCollisions(entity) {
            entity.onGround = false;
            platforms.forEach(plat => {
                if (plat.type === 'fragile' && plat.health <= 0) return;
                if (plat.type === 'ramp') {
                    if (entity.x + entity.r > plat.x && entity.x - entity.r < plat.x + plat.w) {
                        const relativeX = (entity.x - plat.x) / plat.w;
                        let targetY = plat.y + plat.h;
                        if (plat.slope === -1) targetY = plat.y + plat.h - (relativeX * plat.h);
                        else targetY = plat.y + (relativeX * plat.h);
                        if (entity.y + entity.r >= targetY - 10 && entity.y + entity.r <= targetY + 15 && entity.vy >= 0) {
                            entity.y = targetY - entity.r; entity.vy = 0; entity.onGround = true;
                        }
                    }
                } else if (plat.type === 'moving') {
                    plat.x += plat.speed * plat.dir;
                    if (plat.x > plat.xEnd || plat.x < plat.xStart) plat.dir *= -1;
                    if (entity.x + entity.r > plat.x && entity.x - entity.r < plat.x + plat.w && entity.y + entity.r >= plat.y && entity.y - entity.r < plat.y + plat.h) {
                        if (entity.vy >= 0 && entity.y + entity.r - entity.vy <= plat.y + 12) { entity.y = plat.y - entity.r; entity.vy = 0; entity.onGround = true; entity.x += plat.speed * plat.dir; }
                    }
                } else if (plat.type === 'conveyor') {
                    if (entity.x + entity.r > plat.x && entity.x - entity.r < plat.x + plat.w && entity.y + entity.r >= plat.y && entity.y - entity.r < plat.y + plat.h) {
                        if (entity.vy >= 0 && entity.y + entity.r - entity.vy <= plat.y + 12) { entity.y = plat.y - entity.r; entity.vy = 0; entity.onGround = true; entity.x += plat.speed * plat.dir; }
                    }
                } else if (plat.type === 'spring') {
                    if (entity.x + entity.r > plat.x && entity.x - entity.r < plat.x + plat.w && entity.y + entity.r >= plat.y && entity.y - entity.r < plat.y + plat.h) {
                        if (entity.vy >= 0) {
                            entity.vy = -plat.force; playSound('jump');
                            particles.push({ x: plat.x + plat.w / 2, y: plat.y, vx: 0, vy: -2, r: 5, color: '#a1a1aa', life: 15 });
                        }
                    }
                } else {
                    if (entity.x + entity.r > plat.x && entity.x - entity.r < plat.x + plat.w && entity.y + entity.r >= plat.y && entity.y - entity.r < plat.y + plat.h) {
                        if (plat.oneWay) {
                            if (entity.vy >= 0 && entity.y + entity.r - entity.vy <= plat.y + 12) {
                                entity.y = plat.y - entity.r; entity.vy = 0; entity.onGround = true;
                                if (plat.type === 'fragile') {
                                    plat.health -= 0.5;
                                    if (plat.health <= 0) { playSound('hurt'); triggerSystemAlert("¡PLATAFORMA CRÍTICA COMPROMETIDA!"); }
                                }
                            }
                        } else {
                            if (entity.vy >= 0 && entity.y + entity.r - entity.vy <= plat.y + 12) { entity.y = plat.y - entity.r; entity.vy = 0; entity.onGround = true; }
                            else if (entity.vy < 0 && entity.y - entity.r - entity.vy >= plat.y + plat.h - 12) { entity.y = plat.y + plat.h + entity.r; entity.vy = 0; }
                        }
                    }
                }
            });
        }

        // --- IA DEL KILLER BOT ---
