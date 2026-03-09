// Configuração Básica Three.js para um jogo de corrida estilo endless runner
let scene, camera, renderer;
let speed = 2.0;    // Velocidade base para frente (eixo z)
let distance = 0;
let carPositionX = 0; // Posição lateral do carro
let steering = 0;

let roadMarkers = [];
let obstacles = [];
let roadGroup;

let isGameOver = false;

// Elementos de UI
const speedText = document.getElementById('speedometer');
const scoreText = document.getElementById('score');
const steeringWheel = document.getElementById('steering-wheel');
const gameOverScreen = document.getElementById('game-over');

function init() {
    scene = new THREE.Scene();
    // Neblina para disfarçar o horizonte
    scene.fog = new THREE.FogExp2(0x111122, 0.012);
    
    // Câmera em primeira pessoa (dentro do carro)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 2); // Altura dos olhos dentro do carro

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    createEnvironment();
    createLighting();

    window.addEventListener('resize', onWindowResize, false);
    
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    animate();
}

function createEnvironment() {
    roadGroup = new THREE.Group();
    scene.add(roadGroup);

    // Chão (Grama/Terra)
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x051105, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Pista (Asfalto)
    const roadGeo = new THREE.PlaneGeometry(20, 2000);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.49;
    road.receiveShadow = true;
    scene.add(road);

    // Linhas da Pista
    const markerGeo = new THREE.PlaneGeometry(0.5, 4);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
    
    for (let i = 0; i < 60; i++) {
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(0, -0.48, -i * 10);
        roadGroup.add(marker);
        roadMarkers.push(marker);
    }
}

function createLighting() {
    // Luz Ambiente Noturna
    const ambientLight = new THREE.AmbientLight(0x222233, 0.5);
    scene.add(ambientLight);

    // Luz Direcional (Luar)
    const dirLight = new THREE.DirectionalLight(0x5555aa, 0.6);
    dirLight.position.set(100, 200, 50);
    scene.add(dirLight);

    // Faróis do Carro Rosa
    const headlightColor = 0xffffff; // Tonalidade leve do carro rosa 0xffb6c1
    
    const headlight1 = new THREE.SpotLight(headlightColor, 2, 300, Math.PI/5, 0.5, 1);
    headlight1.position.set(-2, 1, camera.position.z);
    headlight1.castShadow = true;
    scene.add(headlight1);
    scene.add(headlight1.target);

    const headlight2 = new THREE.SpotLight(headlightColor, 2, 300, Math.PI/5, 0.5, 1);
    headlight2.position.set(2, 1, camera.position.z);
    headlight2.castShadow = true;
    scene.add(headlight2);
    scene.add(headlight2.target);

    // Store headlights in scene object to update them dynamically
    scene.userData.headlight1 = headlight1;
    scene.userData.headlight2 = headlight2;
}

// Controles
const keys = { left: false, right: false, up: false, down: false };

function onKeyDown(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
}

function onKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
}

function spawnObstacle() {
    // Carro inimigo / Obstáculo genérico
    const geometry = new THREE.BoxGeometry(3.5, 2, 6);
    
    // Cores aleatórias para os carros
    const colors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0x555555];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.5 });
    
    const obs = new THREE.Mesh(geometry, material);
    
    // Escolhe uma faixa aleatória (-6, 0, ou 6)
    const lane = (Math.floor(Math.random() * 3) - 1) * 6;
    
    obs.position.set(lane, 0.5, camera.position.z - 200 - Math.random() * 100);
    obs.castShadow = true;
    obs.receiveShadow = true;
    
    // Lanterna traseira do carro inimigo (neon)
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const taillight1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.1), taillightMat);
    taillight1.position.set(-1.2, 0.2, 3.01);
    obs.add(taillight1);
    
    const taillight2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.1), taillightMat);
    taillight2.position.set(1.2, 0.2, 3.01);
    obs.add(taillight2);

    scene.add(obs);
    obstacles.push(obs);
}

function updateGame() {
    if (isGameOver) return;

    // Aceleração e Frenagem
    if (keys.up) speed += 0.03;
    if (keys.down) speed -= 0.06;
    
    // Atrito natural
    if (!keys.up && !keys.down) {
        speed *= 0.99;
    }

    // Limites de velocidade (entre 1.0 e 7.0 para sentir a velocidade)
    speed = Math.max(1.0, Math.min(speed, 7.0)); 
    
    // Movimento para frente
    camera.position.z -= speed;
    distance += speed / 10;
    
    // Direção
    if (keys.left) carPositionX -= 0.25 * (speed/3);
    if (keys.right) carPositionX += 0.25 * (speed/3);
    
    // Limitar dentro da pista
    carPositionX = Math.max(-8, Math.min(carPositionX, 8));
    
    // Suavizar movimento lateral da câmera
    camera.position.x += (carPositionX - camera.position.x) * 0.2;
    // Pequena inclinação da câmera ao virar
    camera.rotation.z = (carPositionX - camera.position.x) * -0.05;
    
    // Atualizar posição dos faróis
    if (scene.userData.headlight1) {
        scene.userData.headlight1.position.z = camera.position.z;
        scene.userData.headlight1.position.x = camera.position.x - 2;
        scene.userData.headlight1.target.position.set(camera.position.x - 2, 0, camera.position.z - 50);
        
        scene.userData.headlight2.position.z = camera.position.z;
        scene.userData.headlight2.position.x = camera.position.x + 2;
        scene.userData.headlight2.target.position.set(camera.position.x + 2, 0, camera.position.z - 50);
    }

    // Volante da UI
    steering = keys.left ? -45 : (keys.right ? 45 : 0);
    steeringWheel.style.transform = `translateX(-50%) rotate(${steering}deg)`;

    // UI Text
    speedText.innerText = Math.floor(speed * 30) + " km/h";
    scoreText.innerText = "Distância: " + Math.floor(distance) + "m";

    // Reciclar linhas da estrada
    roadMarkers.forEach(m => {
        if (m.position.z > camera.position.z + 10) {
            m.position.z -= 600;
        }
    });

    // Gerar obstáculos
    // Mais rápido vai a pista, mais carros
    if (Math.random() < 0.02 + (speed * 0.005)) {
        if (obstacles.length < 25) {
            spawnObstacle();
        }
    }

    // Atualizar e colidir com obstáculos
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        
        // Colisão AABB simples
        let dx = Math.abs(camera.position.x - obs.position.x);
        let dz = Math.abs(camera.position.z - obs.position.z); // Frente do carro
        
        // A câmera está no centro/trás do "nosso carro"
        if (dx < 3.0 && dz < 4.0) {
            // BATIDA!
            isGameOver = true;
            gameOverScreen.style.display = 'flex';
        }

        // Remover os que ficaram pra trás
        if (obs.position.z > camera.position.z + 20) {
            scene.remove(obs);
            obstacles.splice(i, 1);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    updateGame();
    renderer.render(scene, camera);
}

// Iniciar Jogo
init();
