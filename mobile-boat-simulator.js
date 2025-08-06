// Mobile optimization settings
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Scene setup with mobile optimizations
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87CEEB, 10, isMobile ? 300 : 500);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    isMobile ? 500 : 1000
);

const renderer = new THREE.WebGLRenderer({ 
    antialias: !isMobile, // Disable antialiasing on mobile for performance
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = !isMobile; // Disable shadows on mobile for performance
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
if (!isMobile) {
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
}
scene.add(directionalLight);

// Simplified sky for mobile
const skyGeometry = new THREE.SphereGeometry(300, 16, 16);
const skyMaterial = new THREE.MeshBasicMaterial({
    color: 0x87CEEB,
    side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// Mobile-optimized Ocean class
class Ocean {
    constructor() {
        // Reduce geometry complexity for mobile
        const segments = isMobile ? 64 : 128;
        this.geometry = new THREE.PlaneGeometry(400, 400, segments, segments);
        this.material = new THREE.MeshPhongMaterial({
            color: 0x006994,
            transparent: true,
            opacity: 0.8,
            shininess: isMobile ? 50 : 100,
            side: THREE.DoubleSide,
            flatShading: isMobile // Use flat shading on mobile
        });
        
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.receiveShadow = !isMobile;
        
        this.vertices = this.geometry.attributes.position.array;
        this.originalVertices = new Float32Array(this.vertices.length);
        for (let i = 0; i < this.vertices.length; i++) {
            this.originalVertices[i] = this.vertices[i];
        }
        
        // Adjusted wave parameters for mobile
        this.waveSpeed = 0.5;
        this.waveAmplitude = 1.5;
        this.waveFrequency = 0.1;
        this.swellAmplitude = 2.5;
        this.swellFrequency = 0.05;
        this.time = 0;
        
        scene.add(this.mesh);
    }
    
    update(deltaTime) {
        this.time += deltaTime * this.waveSpeed;
        
        const vertices = this.geometry.attributes.position.array;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = this.originalVertices[i];
            const y = this.originalVertices[i + 1];
            
            let height = 0;
            
            // Simplified wave calculation for mobile
            height += Math.sin(x * this.swellFrequency + this.time) * this.swellAmplitude;
            height += Math.cos(y * this.swellFrequency + this.time * 0.7) * this.swellAmplitude * 0.7;
            
            if (!isMobile) {
                height += Math.sin(x * this.waveFrequency * 2 + this.time * 2) * this.waveAmplitude;
                height += Math.cos(y * this.waveFrequency * 2 + this.time * 1.5) * this.waveAmplitude * 0.5;
                height += Math.sin(x * 0.3 + y * 0.3 + this.time * 3) * 0.3;
            }
            
            vertices[i + 2] = height;
        }
        
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeVertexNormals();
    }
    
    getWaveHeightAt(x, z) {
        let height = 0;
        
        height += Math.sin(x * this.swellFrequency + this.time) * this.swellAmplitude;
        height += Math.cos(z * this.swellFrequency + this.time * 0.7) * this.swellAmplitude * 0.7;
        
        if (!isMobile) {
            height += Math.sin(x * this.waveFrequency * 2 + this.time * 2) * this.waveAmplitude;
            height += Math.cos(z * this.waveFrequency * 2 + this.time * 1.5) * this.waveAmplitude * 0.5;
            height += Math.sin(x * 0.3 + z * 0.3 + this.time * 3) * 0.3;
        }
        
        return height;
    }
    
    getNormalAt(x, z) {
        const epsilon = 0.1;
        const h = this.getWaveHeightAt(x, z);
        const hx = this.getWaveHeightAt(x + epsilon, z);
        const hz = this.getWaveHeightAt(x, z + epsilon);
        
        const dx = (hx - h) / epsilon;
        const dz = (hz - h) / epsilon;
        
        const normal = new THREE.Vector3(-dx, 1, -dz);
        normal.normalize();
        
        return normal;
    }
}

// Boat class
class Boat {
    constructor() {
        this.group = new THREE.Group();
        
        // Simplified boat geometry for mobile
        const hullGeometry = new THREE.BoxGeometry(4, 2, 8);
        const hullMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8B4513,
            shininess: 30,
            flatShading: isMobile
        });
        this.hull = new THREE.Mesh(hullGeometry, hullMaterial);
        this.hull.castShadow = !isMobile;
        this.hull.receiveShadow = !isMobile;
        this.group.add(this.hull);
        
        const cabinGeometry = new THREE.BoxGeometry(3, 2, 3);
        const cabinMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFFFFF,
            shininess: 50,
            flatShading: isMobile
        });
        this.cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        this.cabin.position.y = 2;
        this.cabin.position.z = -1;
        this.cabin.castShadow = !isMobile;
        this.group.add(this.cabin);
        
        const mastGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
        const mastMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x444444,
            flatShading: isMobile
        });
        this.mast = new THREE.Mesh(mastGeometry, mastMaterial);
        this.mast.position.y = 4;
        this.mast.castShadow = !isMobile;
        this.group.add(this.mast);
        
        this.group.position.y = 5;
        scene.add(this.group);
        
        // Physics properties
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.angularVelocity = 0;
        this.speed = 0;
        this.maxSpeed = 20;
        this.acceleration = 10;
        this.turnSpeed = 2;
        this.bobAmount = 0;
        this.rollAmount = 0;
        this.pitchAmount = 0;
        
        this.buoyancyForce = 15;
        this.damping = 0.95;
        this.angularDamping = 0.9;
    }
    
    update(deltaTime, ocean, controls) {
        // Handle joystick input
        if (Math.abs(controls.moveY) > 0.1) {
            this.speed += controls.moveY * this.acceleration * deltaTime;
            this.speed = Math.max(-this.maxSpeed * 0.5, Math.min(this.maxSpeed, this.speed));
        } else {
            this.speed *= 0.95;
        }
        
        if (controls.boost) {
            this.speed = Math.min(this.speed + this.acceleration * 2 * deltaTime, this.maxSpeed * 1.5);
            // Vibrate on boost if supported
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }
        
        // Turning based on joystick X
        if (Math.abs(controls.moveX) > 0.1) {
            this.angularVelocity = -controls.moveX * this.turnSpeed;
        } else {
            this.angularVelocity *= this.angularDamping;
        }
        
        this.group.rotation.y += this.angularVelocity * deltaTime * (Math.abs(this.speed) / this.maxSpeed);
        
        const direction = new THREE.Vector3(
            Math.sin(this.group.rotation.y),
            0,
            Math.cos(this.group.rotation.y)
        );
        
        this.velocity.x = direction.x * this.speed;
        this.velocity.z = direction.z * this.speed;
        
        this.group.position.x += this.velocity.x * deltaTime;
        this.group.position.z += this.velocity.z * deltaTime;
        
        const waveHeight = ocean.getWaveHeightAt(this.group.position.x, this.group.position.z);
        const targetY = waveHeight + 1;
        
        const yDiff = targetY - this.group.position.y;
        this.velocity.y += yDiff * this.buoyancyForce * deltaTime;
        this.velocity.y *= this.damping;
        this.group.position.y += this.velocity.y * deltaTime;
        
        const normal = ocean.getNormalAt(this.group.position.x, this.group.position.z);
        
        const targetPitch = Math.atan2(normal.z, normal.y);
        const targetRoll = Math.atan2(-normal.x, normal.y);
        
        this.pitchAmount += (targetPitch - this.pitchAmount) * deltaTime * 3;
        this.rollAmount += (targetRoll - this.rollAmount) * deltaTime * 3;
        
        const speedFactor = Math.abs(this.speed) / this.maxSpeed;
        this.group.rotation.x = this.pitchAmount * (0.3 + speedFactor * 0.7);
        this.group.rotation.z = this.rollAmount * (0.3 + speedFactor * 0.7);
        
        this.group.rotation.z += this.angularVelocity * 0.2 * speedFactor;
        
        this.bobAmount += deltaTime * 2;
        this.group.position.y += Math.sin(this.bobAmount) * 0.05;
        
        if (controls.reset) {
            this.group.position.set(0, 5, 0);
            this.group.rotation.set(0, 0, 0);
            this.velocity.set(0, 0, 0);
            this.speed = 0;
            this.angularVelocity = 0;
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
        }
    }
}

// Mobile Touch Controls
class MobileControls {
    constructor() {
        this.moveX = 0;
        this.moveY = 0;
        this.cameraX = 0;
        this.cameraY = 0;
        this.boost = false;
        this.reset = false;
        
        this.setupJoysticks();
        this.setupButtons();
        this.preventDefaultTouches();
    }
    
    setupJoysticks() {
        // Movement Joystick
        const moveJoystick = document.getElementById('movementJoystick');
        const moveThumb = document.getElementById('moveThumb');
        let moveActive = false;
        let moveStartX = 0;
        let moveStartY = 0;
        
        const handleMoveStart = (e) => {
            moveActive = true;
            const touch = e.touches ? e.touches[0] : e;
            const rect = moveJoystick.getBoundingClientRect();
            moveStartX = rect.left + rect.width / 2;
            moveStartY = rect.top + rect.height / 2;
            this.createTouchFeedback(touch.clientX, touch.clientY);
        };
        
        const handleMoveMove = (e) => {
            if (!moveActive) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            const deltaX = touch.clientX - moveStartX;
            const deltaY = touch.clientY - moveStartY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 40;
            
            if (distance > maxDistance) {
                const angle = Math.atan2(deltaY, deltaX);
                this.moveX = Math.cos(angle);
                this.moveY = -Math.sin(angle);
                moveThumb.style.transform = `translate(${Math.cos(angle) * maxDistance - 25}px, ${Math.sin(angle) * maxDistance - 25}px)`;
            } else {
                this.moveX = deltaX / maxDistance;
                this.moveY = -deltaY / maxDistance;
                moveThumb.style.transform = `translate(${deltaX - 25}px, ${deltaY - 25}px)`;
            }
        };
        
        const handleMoveEnd = () => {
            moveActive = false;
            this.moveX = 0;
            this.moveY = 0;
            moveThumb.style.transform = 'translate(-25px, -25px)';
        };
        
        moveJoystick.addEventListener('touchstart', handleMoveStart, { passive: false });
        moveJoystick.addEventListener('touchmove', handleMoveMove, { passive: false });
        moveJoystick.addEventListener('touchend', handleMoveEnd);
        moveJoystick.addEventListener('touchcancel', handleMoveEnd);
        
        // Camera Control
        const cameraControl = document.getElementById('cameraControl');
        const cameraThumb = document.getElementById('cameraThumb');
        let cameraActive = false;
        let cameraStartX = 0;
        let cameraStartY = 0;
        
        const handleCameraStart = (e) => {
            cameraActive = true;
            const touch = e.touches ? e.touches[0] : e;
            const rect = cameraControl.getBoundingClientRect();
            cameraStartX = rect.left + rect.width / 2;
            cameraStartY = rect.top + rect.height / 2;
            this.createTouchFeedback(touch.clientX, touch.clientY);
        };
        
        const handleCameraMove = (e) => {
            if (!cameraActive) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            const deltaX = touch.clientX - cameraStartX;
            const deltaY = touch.clientY - cameraStartY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 40;
            
            if (distance > maxDistance) {
                const angle = Math.atan2(deltaY, deltaX);
                this.cameraX = Math.cos(angle);
                this.cameraY = Math.sin(angle);
                cameraThumb.style.transform = `translate(${Math.cos(angle) * maxDistance - 20}px, ${Math.sin(angle) * maxDistance - 20}px)`;
            } else {
                this.cameraX = deltaX / maxDistance;
                this.cameraY = deltaY / maxDistance;
                cameraThumb.style.transform = `translate(${deltaX - 20}px, ${deltaY - 20}px)`;
            }
        };
        
        const handleCameraEnd = () => {
            cameraActive = false;
            this.cameraX = 0;
            this.cameraY = 0;
            cameraThumb.style.transform = 'translate(-20px, -20px)';
        };
        
        cameraControl.addEventListener('touchstart', handleCameraStart, { passive: false });
        cameraControl.addEventListener('touchmove', handleCameraMove, { passive: false });
        cameraControl.addEventListener('touchend', handleCameraEnd);
        cameraControl.addEventListener('touchcancel', handleCameraEnd);
    }
    
    setupButtons() {
        // Boost button
        const boostButton = document.getElementById('boostButton');
        boostButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.boost = true;
            boostButton.style.transform = 'scale(0.95)';
        });
        
        boostButton.addEventListener('touchend', () => {
            this.boost = false;
            boostButton.style.transform = 'scale(1)';
        });
        
        boostButton.addEventListener('touchcancel', () => {
            this.boost = false;
            boostButton.style.transform = 'scale(1)';
        });
        
        // Reset button
        const resetButton = document.getElementById('resetButton');
        resetButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.reset = true;
            resetButton.style.transform = 'scale(0.9)';
        });
        
        resetButton.addEventListener('touchend', () => {
            this.reset = false;
            resetButton.style.transform = 'scale(1)';
        });
    }
    
    createTouchFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.className = 'touch-feedback';
        feedback.style.left = x + 'px';
        feedback.style.top = y + 'px';
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 600);
    }
    
    preventDefaultTouches() {
        document.addEventListener('touchstart', (e) => {
            if (e.target.tagName !== 'CANVAS') {
                e.stopPropagation();
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }
}

// Orientation detection
function checkOrientation() {
    const orientationMessage = document.getElementById('orientationMessage');
    if (window.innerHeight > window.innerWidth && isMobile) {
        orientationMessage.style.display = 'flex';
    } else {
        orientationMessage.style.display = 'none';
    }
}

window.addEventListener('orientationchange', checkOrientation);
window.addEventListener('resize', () => {
    checkOrientation();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize
const ocean = new Ocean();
const boat = new Boat();
const controls = new MobileControls();

// Camera follow function optimized for mobile
let cameraAngle = 0;
let cameraHeight = 0;

function updateCamera() {
    // Update camera angle based on touch input
    cameraAngle += controls.cameraX * 0.05;
    cameraHeight = controls.cameraY * 5;
    
    const cameraDistance = 12;
    const baseCameraHeight = 6;
    
    const cameraOffset = new THREE.Vector3(
        Math.sin(boat.group.rotation.y + cameraAngle) * cameraDistance,
        baseCameraHeight + cameraHeight,
        Math.cos(boat.group.rotation.y + cameraAngle) * cameraDistance
    );
    
    camera.position.lerp(
        boat.group.position.clone().add(cameraOffset),
        0.15
    );
    
    camera.lookAt(boat.group.position);
}

// UI updates
function updateUI() {
    const speed = Math.abs(boat.speed);
    document.getElementById('speed').textContent = speed.toFixed(0);
    document.getElementById('waveHeight').textContent = 
        ocean.getWaveHeightAt(boat.group.position.x, boat.group.position.z).toFixed(1);
    
    // Update speed bar
    const speedBar = document.getElementById('speedBar');
    const speedPercent = (speed / boat.maxSpeed) * 100;
    speedBar.style.width = Math.min(speedPercent, 100) + '%';
}

// Performance monitoring for mobile
let frameCount = 0;
let lastFpsUpdate = performance.now();
let targetFPS = 30;

// Animation loop with mobile optimization
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = Math.min(clock.getDelta(), 0.1); // Cap delta time
    
    // Skip frames if running too slow on mobile
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate > 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = now;
        
        // Adjust quality if FPS is too low
        if (fps < 25 && isMobile) {
            renderer.setPixelRatio(1);
        }
    }
    
    ocean.update(deltaTime);
    boat.update(deltaTime, ocean, controls);
    updateCamera();
    updateUI();
    
    renderer.render(scene, camera);
}

// Start
checkOrientation();
animate();

// Wake lock to prevent screen from sleeping
if ('wakeLock' in navigator) {
    navigator.wakeLock.request('screen').catch(err => {
        console.log('Wake Lock error:', err);
    });
}

// Add service worker for offline capability (optional)
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}
