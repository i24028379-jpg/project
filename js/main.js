(() => {
    const canvas = document.getElementById('scene');
    const IMAGE_FILES = [
        'images/y1.jpg', 'images/y2.jpg',
        'images/k1.jpg', 'images/k2.jpg', 'images/k3.jpg', 'images/k4.jpg',
        'images/mito4.png', 'images/mito5.png', 'images/mito6.png', 'images/mito7.png', 'images/mito8.png', 'images/mito9.png',
        'images/z1.png', 'images/z2.png', 'images/z3.png',
        'images/title.jpeg',
        'images/banner5.png', 'images/jianjie.jpg'
    ];
    if (!canvas) return;

    // Fallback: run with DOM/CSS 3D if opened via file:// or when WebGL is unavailable
    if (location.protocol === 'file:' || !window.THREE) {
        try { domFallback(IMAGE_FILES); } catch (e) {}
        return;
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    if (renderer.outputColorSpace !== undefined) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0b12, 0.03);

    const camera = new THREE.PerspectiveCamera(
        80,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(0, 0, 8);
    scene.add(camera);
    let cameraTargetZ = camera.position.z;
    const MIN_Z = 2.2;
    const MAX_Z = 32;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const directional = new THREE.DirectionalLight(0xffffff, 0.85);
    directional.position.set(5, 7, 10);
    scene.add(ambient, directional);

    // Gallery group
    const gallery = new THREE.Group();
    scene.add(gallery);

    // Background particles
    const particles = new THREE.Group();
    scene.add(particles);

    const particleGeometry = new THREE.SphereGeometry(0.02, 6, 6);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x9c7ff7, transparent: true, opacity: 0.35 });
    for (let i = 0; i < 420; i++) {
        const p = new THREE.Mesh(particleGeometry, particleMaterial);
        p.position.set(
            (Math.random() - 0.5) * 36,
            (Math.random() - 0.5) * 20,
            -Math.random() * 120 - 4
        );
        p.scale.setScalar(0.6 + Math.random() * 2.2);
        particles.add(p);
    }

    // Image planes
    const textureLoader = new THREE.TextureLoader();
    if (textureLoader.setCrossOrigin) textureLoader.setCrossOrigin('anonymous');
    const imageFiles = IMAGE_FILES;

    const planes = [];
    let loadedCount = 0;
    let errorCount = 0;
    const baseWidth = 2.1; // world units

    // Layered placement for stronger spatial depth
    const layers = [
        { name: 'near', radiusX: 6.5, radiusY: 4.0, zMin: 6,  zMax: 12 },
        { name: 'mid',  radiusX: 9.5, radiusY: 5.5, zMin: 16, zMax: 30 },
        { name: 'far',  radiusX: 12.5, radiusY: 7.0, zMin: 34, zMax: 56 }
    ];
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

    function setRandomPlacement(mesh, index) {
        const layer = layers[Math.floor(Math.random() * layers.length)];
        const angle = (index + Math.random() * 25) * GOLDEN_ANGLE;
        const depth = layer.zMin + Math.random() * (layer.zMax - layer.zMin);
        const jitterX = (Math.random() - 0.5) * 1.2;
        const jitterY = (Math.random() - 0.5) * 0.9;
        mesh.position.set(
            Math.cos(angle) * (layer.radiusX + jitterX),
            Math.sin(angle) * (layer.radiusY + jitterY),
            -depth
        );
        mesh.rotation.set(
            (Math.random() - 0.5) * 0.35,
            (Math.random() - 0.5) * 0.35,
            (Math.random() - 0.5) * 0.9
        );
        const scaleByDepth = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(depth, 6, 56, 1.85, 0.6), 0.5, 2.4);
        mesh.scale.setScalar(scaleByDepth);
        mesh.userData.baseZ = mesh.position.z;
        mesh.userData.depth = depth;
    }

    function addImagePlane(path, index) {
        textureLoader.load(path, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy?.() || 8, 8);

            const img = tex.image;
            const aspect = img && img.width ? (img.height / img.width) : 1.0;
            const geometry = new THREE.PlaneGeometry(baseWidth, baseWidth * aspect, 1, 1);
            const material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: true });
            const mesh = new THREE.Mesh(geometry, material);

            // Initial random placement
            setRandomPlacement(mesh, index);

            gallery.add(mesh);
            planes.push(mesh);
            loadedCount++;
            // Schedule random relayout per plane
            mesh.material.opacity = 1;
            mesh.userData.anim = { phase: 'idle', t: 0, next: performance.now() / 1000 + (1.2 + Math.random() * 3.6) };
        }, undefined, () => { errorCount++; });
    }

    imageFiles.forEach((p, i) => addImagePlane(p, i));

    // If no images load (likely opened via file://), show a helpful hint
    setTimeout(() => {
        if (loadedCount === 0) {
            const hint = document.querySelector('.hint');
            if (hint) {
                hint.textContent = 'No images? If you opened this via file://, start a local server and open http://localhost instead.';
            }
        }
    }, 2000);

    // Interaction
    let mouseX = 0, mouseY = 0;
    let targetRotX = 0, targetRotY = 0;
    let isDragging = false;
    let lastX = 0, lastY = 0;

    function onPointerMove(e) {
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        const nx = (x / window.innerWidth) * 2 - 1;
        const ny = (y / window.innerHeight) * 2 - 1;
        mouseX = nx; mouseY = ny;
        if (isDragging) {
            const dx = x - lastX;
            const dy = y - lastY;
            targetRotY += dx * 0.0025;
            targetRotX += dy * 0.0025;
            lastX = x; lastY = y;
        }
    }
    function onPointerDown(e) {
        isDragging = true;
        lastX = e.touches ? e.touches[0].clientX : e.clientX;
        lastY = e.touches ? e.touches[0].clientY : e.clientY;
    }
    function onPointerUp() { isDragging = false; }

    let pinchStartDist = 0;
    function onTouchMove(e) {
        if (e.touches && e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (!pinchStartDist) pinchStartDist = dist;
            const delta = (pinchStartDist - dist) * 0.015;
            cameraTargetZ = THREE.MathUtils.clamp(cameraTargetZ + delta, MIN_Z, MAX_Z);
            pinchStartDist = dist;
        }
        onPointerMove(e);
    }
    function onTouchEnd() { pinchStartDist = 0; isDragging = false; }

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('mousedown', onPointerDown, { passive: true });
    window.addEventListener('mouseup', onPointerUp, { passive: true });
    window.addEventListener('mouseleave', onPointerUp, { passive: true });
    window.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    window.addEventListener('wheel', (e) => {
        cameraTargetZ = THREE.MathUtils.clamp(
            cameraTargetZ + (e.deltaY > 0 ? 1.2 : -1.2),
            MIN_Z,
            MAX_Z
        );
    }, { passive: true });

    // Resize
    function onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', onResize);

    // Animation
    function lerp(a, b, t) { return a + (b - a) * t; }

    const clock = new THREE.Clock();
    function animate() {
        const dt = Math.min(clock.getDelta(), 0.033);

        // Stronger group drift
        gallery.rotation.y = lerp(gallery.rotation.y, targetRotY + mouseX * 0.55, 0.08);
        gallery.rotation.x = lerp(gallery.rotation.x, targetRotX - mouseY * 0.35, 0.08);
        particles.rotation.y += dt * 0.08;

        // Depth parallax by position offset (stronger)
        const parallaxX = mouseX * 0.95;
        const parallaxY = -mouseY * 0.75;
        camera.position.x = lerp(camera.position.x, parallaxX, 0.08);
        camera.position.y = lerp(camera.position.y, parallaxY, 0.08);

        // Smooth dolly towards target plus subtle mouse Y based push-pull
        camera.position.z = lerp(camera.position.z, cameraTargetZ + mouseY * 0.6, 0.08);
        camera.lookAt(0, 0, -8);

        // Per-plane float + periodic fade-out/reposition/fade-in
        const now = performance.now() / 1000;
        for (let i = 0; i < planes.length; i++) {
            const m = planes[i];
            const tWave = performance.now() * 0.0006 + i;
            const s = Math.sin(tWave) * 0.01;
            m.rotation.z += s;
            if (m.userData && typeof m.userData.baseZ === 'number') {
                const amp = THREE.MathUtils.mapLinear(m.userData.depth || 20, 6, 56, 0.65, 0.15);
                m.position.z = m.userData.baseZ + Math.sin(tWave * 0.8) * amp;
            }

            // animation state machine
            const anim = m.userData && m.userData.anim;
            if (!anim) continue;
            if (anim.phase === 'idle' && now >= anim.next) {
                anim.phase = 'fadeOut';
                anim.t = 0; // 0..1 over 2s
            }
            if (anim.phase === 'fadeOut') {
                anim.t += dt / 2.0; // 2s
                m.material.opacity = 1 - Math.min(anim.t, 1);
                if (anim.t >= 1) {
                    // relocate while invisible
                    setRandomPlacement(m, i);
                    m.material.opacity = 0.01;
                    anim.phase = 'fadeIn';
                    anim.t = 0;
                }
            } else if (anim.phase === 'fadeIn') {
                anim.t += dt / 1.1; // ~1.1s fade in
                m.material.opacity = Math.min(anim.t, 1);
                if (anim.t >= 1) {
                    anim.phase = 'idle';
                    anim.next = now + (1.5 + Math.random() * 3.0);
                }
            }
        }

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }
    animate();
})();


// DOM/CSS 3D fallback (works from local file system)
function domFallback(imageFiles) {
    const existingCanvas = document.getElementById('scene');
    if (existingCanvas) existingCanvas.style.display = 'none';
    const overlayHint = document.querySelector('.hint');
    if (overlayHint) overlayHint.textContent = 'Move/drag to explore | Scroll to zoom (Local mode)';

    const container = document.createElement('div');
    container.className = 'dom-scene';
    const root = document.createElement('div');
    root.className = 'dom-root';
    container.appendChild(root);
    document.body.appendChild(container);

    // Create items with random positions and depth
    const W = window.innerWidth;
    const H = window.innerHeight;
    const layers = [
        { zMin: -350, zMax: -650, size: 280 },
        { zMin: -700, zMax: -1100, size: 220 },
        { zMin: -1150, zMax: -1600, size: 180 }
    ];
    const items = [];
    imageFiles.forEach((src, i) => {
        const layer = layers[i % layers.length];
        const item = document.createElement('div');
        item.className = 'dom-item';
        const img = document.createElement('img');
        img.src = src;
        img.decoding = 'async';
        img.loading = 'lazy';
        img.style.width = layer.size + 'px';
        item.appendChild(img);

        const z = rand(layer.zMin, layer.zMax);
        const x = rand(-W * 0.6, W * 0.6);
        const y = rand(-H * 0.5, H * 0.5);
        const rz = rand(-18, 18);
        const ry = rand(-12, 12);
        item.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateZ(${rz}deg) rotateY(${ry}deg)`;
        root.appendChild(item);
        items.push(item);
    });

    // Interaction
    let isDragging = false;
    let lastX = 0, lastY = 0;
    let rotX = -2, rotY = 0;
    let targetRotX = rotX, targetRotY = rotY;
    let zoomZ = -200; // push/pull root

    function onMove(e) {
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        const nx = (x / window.innerWidth) * 2 - 1;
        const ny = (y / window.innerHeight) * 2 - 1;
        if (isDragging) {
            targetRotY += (x - lastX) * 0.08;
            targetRotX -= (y - lastY) * 0.08;
        } else {
            targetRotY = nx * 12;
            targetRotX = -ny * 8;
        }
        lastX = x; lastY = y;
    }
    function onDown(e) { isDragging = true; lastX = e.clientX || e.touches?.[0]?.clientX || 0; lastY = e.clientY || e.touches?.[0]?.clientY || 0; }
    function onUp() { isDragging = false; }
    function onWheel(e) { zoomZ += (e.deltaY > 0 ? -80 : 80); zoomZ = clamp(zoomZ, -1200, 400); }

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown, { passive: true });
    window.addEventListener('mouseup', onUp, { passive: true });
    window.addEventListener('mouseleave', onUp, { passive: true });
    window.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });

    function tick() {
        rotX = lerp(rotX, targetRotX, 0.08);
        rotY = lerp(rotY, targetRotY, 0.08);
        root.style.transform = `translateZ(${zoomZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        requestAnimationFrame(tick);
    }
    tick();

    function rand(a, b) { return a + Math.random() * (b - a); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    // Periodic fade-out and random reappear for DOM items
    function relocate(item) {
        item.classList.add('hidden');
        setTimeout(() => {
            const layer = layers[Math.floor(Math.random() * layers.length)];
            const z = rand(layer.zMin, layer.zMax);
            const x = rand(-W * 0.6, W * 0.6);
            const y = rand(-H * 0.5, H * 0.5);
            const rz = rand(-18, 18);
            const ry = rand(-12, 12);
            item.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateZ(${rz}deg) rotateY(${ry}deg)`;
            // Next frame remove to fade in
            requestAnimationFrame(() => item.classList.remove('hidden'));
        }, 2000); // 2s fade out
    }

    // Schedule each item independently to avoid all switching at once
    items.forEach((it, idx) => {
        const firstDelay = 800 + Math.random() * 2200 + idx * 90;
        setTimeout(function loop() {
            relocate(it);
            setTimeout(loop, 1500 + Math.random() * 2500);
        }, firstDelay);
    });
}

