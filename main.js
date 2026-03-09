// --- PERFOMANCE OPTIMIZATION: REMOVED HEAVY SHADOWS & PROCEDURAL COMPLEXITY ---
let scene, camera, renderer;
let speed = 2.0;
let distance = 0;
let carPositionX = 0;
let steering = 0;

let roadMarkers = [];
let obstacles = [];
let roadGroup;
let cityBuildings = [];

let isGameOver = false;

// Elementos de UI
const speedText = document.getElementById('speedometer');
const scoreText = document.getElementById('score');
const steeringWheel = document.getElementById('steering-wheel');
const gameOverScreen = document.getElementById('game-over');
const loadingScreen = document.getElementById('loading');
const leftHand = document.getElementById('left-hand');
const rightHand = document.getElementById('right-hand');
const mirrorReflect = document.querySelector('.mirror-reflection');

// Materiais reutilizados (Performance boost: em vez de criar material toda hora, criamos 1x e reusamos)
const buildingGeo = new THREE.BoxGeometry(10, 40, 10);
const matRoad = new THREE.MeshBasicMaterial({ color: 0x333333 }); // Sem necessidade de calculo de luz na estrada pra salvar FPS
const matMarker = new THREE.MeshBasicMaterial({ color: 0xffffff });
const matGrass = new THREE.MeshBasicMaterial({ color: 0x33aa33 }); // Grama diurna

// Cores dos carros inimigos
const carColors = [
    new THREE.MeshLambertMaterial({color: 0xff3333}), // Vermelho
    new THREE.MeshLambertMaterial({color: 0x3333ff}), // Azul
    new THREE.MeshLambertMaterial({color: 0xcccccc}), // Prata
    new THREE.MeshLambertMaterial({color: 0xcccc00}), // Amarelo
    new THREE.MeshLambertMaterial({color: 0x111111})  // Preto
];

// Car model base (Caixa simples: Altissima performance)
const carGeo = new THREE.BoxGeometry(3.5, 1.5, 8.0);
const windowGeo = new THREE.BoxGeometry(3.0, 1.0, 4.0);
const matWindow = new THREE.MeshBasicMaterial({ color: 0x111111 });

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); 
    // Neblina cinza claro pra misturar estrada e ceu sem ficar azul berrante no chao
    scene.fog = new THREE.Fog(0xb4d3e0, 100, 500); 
    
    // Câmera perfeitamente posicionada na visão do motorista (esquerda)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 700);
    camera.position.set(-1.0, 1.3, 1.5); 

    // Renderizador otimizado
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limita o pixel ratio em telas 4k pra não travar
    document.getElementById('game-container').appendChild(renderer.domElement);

    createEnvironment();
    createLighting();

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Esconde loading
    loadingScreen.style.display = 'none';

    animate();
}

function createEnvironment() {
    roadGroup = new THREE.Group();
    scene.add(roadGroup);

    // Chão (Grama verde claro)
    const groundGeo = new THREE.PlaneGeometry(1000, 1000);
    const ground = new THREE.Mesh(groundGeo, matGrass);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    // Pista de Asfalto (Cinza claro pra dia)
    const roadGeo = new THREE.PlaneGeometry(30, 2000);
    const road = new THREE.Mesh(roadGeo, matRoad);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    scene.add(road);

    // Faixas
    const markerGeo = new THREE.PlaneGeometry(0.5, 6);
    for (let i = 0; i < 60; i++) {
        const markerL = new THREE.Mesh(markerGeo, matMarker);
        markerL.rotation.x = -Math.PI / 2;
        markerL.position.set(-5, 0.05, -i * 15);
        roadGroup.add(markerL);
        roadMarkers.push(markerL);

        const markerR = new THREE.Mesh(markerGeo, matMarker);
        markerR.rotation.x = -Math.PI / 2;
        markerR.position.set(5, 0.05, -i * 15);
        roadGroup.add(markerR);
        roadMarkers.push(markerR);
    }

    // Predios laterais (Cidade)
    const buildingMats = [
        new THREE.MeshLambertMaterial({color: 0x888888}),
        new THREE.MeshLambertMaterial({color: 0xaaaaaa}),
        new THREE.MeshLambertMaterial({color: 0x99aacc})
    ];

    for(let i = 0; i < 40; i++) {
        // Altura aleatoria
        let height = 20 + Math.random() * 40;
        let bGeo = new THREE.BoxGeometry(15, height, 15);
        let bMat = buildingMats[Math.floor(Math.random() * buildingMats.length)];
        
        // Predio Esquerda
        let bLeft = new THREE.Mesh(bGeo, bMat);
        bLeft.position.set(-35 - Math.random()*20, height/2, -i * 30);
        scene.add(bLeft);
        cityBuildings.push(bLeft);

        // Predio Direita
        let bRight = new THREE.Mesh(bGeo, bMat);
        bRight.position.set(35 + Math.random()*20, height/2, -i * 30);
        scene.add(bRight);
        cityBuildings.push(bRight);
    }
}

function createLighting() {
    // Luz Direcional forte vindo de cima (Sol)
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffee, 0.8);
    sun.position.set(100, 300, 50);
    scene.add(sun);
    // REMOVIDO CASTSHADOW PARA SALVAR 60FPS
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
    // Super otimizado: 2 caixas por carro
    let obs = new THREE.Group();
    
    let chassiMat = carColors[Math.floor(Math.random() * carColors.length)];
    let chassi = new THREE.Mesh(carGeo, chassiMat);
    chassi.position.y = 0.75;
    obs.add(chassi);

    let vidro = new THREE.Mesh(windowGeo, matWindow);
    vidro.position.y = 1.6;
    obs.add(vidro);
    
    // Posições realistas de faixa (-10, 0, 10 na pista de 30)
    const lane = (Math.floor(Math.random() * 3) - 1) * 10;
    
    obs.position.set(lane, 0, camera.position.z - 250 - Math.random() * 100);
    
    // Velocidade do trafego
    obs.userData.speedZ = (Math.random() * 1.5) + 1.0;

    scene.add(obs);
    obstacles.push(obs);
}

function updateGame() {
    if (isGameOver) return;

    // Aceleração
    if (keys.up) speed += 0.05;
    if (keys.down) speed -= 0.1;
    if (!keys.up && !keys.down) speed *= 0.99;

    speed = Math.max(0.0, Math.min(speed, 4.5)); // Limite de velocidade bem menor
    
    // Movimento do mundo
    camera.position.z -= speed;
    distance += speed / 10;
    
    // Curva Bruta (direção responde MUITO mais rápido)
    let maxSteerSpeed = 0.6 * (speed / 3);
    if(speed < 1.0) maxSteerSpeed = 0;

    if (keys.left) carPositionX -= maxSteerSpeed;
    if (keys.right) carPositionX += maxSteerSpeed;
    
    carPositionX = Math.max(-12, Math.min(carPositionX, 12));
    
    // Câmera acompanha de forma mais agressiva a direção
    camera.position.x += ((carPositionX - 1.0) - camera.position.x) * 0.35; 
    
    // Volante inclina mais
    let steerTarget = keys.left ? 0.08 : (keys.right ? -0.08 : 0);
    camera.rotation.z += (steerTarget - camera.rotation.z) * 0.2;
    // Tremedeira de velocidade diminuida pra incomodar menos o FPS
    camera.position.y = 1.3 + (Math.random() * (speed*0.002));

    // UI Updates
    steering = keys.left ? -75 : (keys.right ? 75 : 0); // Vira 75 graus bruscamente
    
    let currentRotation = parseFloat(steeringWheel.style.transform.replace(/[^0-9\-.,]/g, '').split(',')[2] || 0);
    if(isNaN(currentRotation)) currentRotation = 0;
    let newRot = currentRotation + (steering - currentRotation) * 0.4; // Responsividade alta
    
    // Rotate Steering wheel and the Hands together!
    steeringWheel.style.transform = `translateX(-50%) rotate(${newRot}deg)`;
    leftHand.style.transform = `rotate(${30 + newRot}deg) translateY(${Math.abs(newRot)*0.2}px)`;
    rightHand.style.transform = `rotate(${-30 + newRot}deg) translateY(${Math.abs(newRot)*0.2}px)`;

    // Speed UI
    speedText.innerHTML = `${Math.floor(speed * 18)}<br><span style="font-size:16px;color:#aaa">km/h</span>`;
    scoreText.innerText = "Pontos: " + Math.floor(distance);

    // Efeito de movimento do espelho (background position trick pra fingir reflexo da pista rápida)
    mirrorReflect.style.backgroundPosition = `0px ${distance * 5}px`;

    // Looping da estrada
    roadMarkers.forEach(m => {
        if (m.position.z > camera.position.z + 10) m.position.z -= 900;
    });

    // Looping dos predios
    cityBuildings.forEach(b => {
        if (b.position.z > camera.position.z + 20) b.position.z -= 1200;
    });

    // Trafego Spawner
    let spawnRate = 0.02 + (speed * 0.005);
    if (Math.random() < spawnRate && obstacles.length < 12) { // Max traffic bem menor
        spawnObstacle();
    }

    // Calculo Colisao (Box Simplificada e rapida)
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        
        obs.position.z -= obs.userData.speedZ;
        
        let myCarCenterX = camera.position.x + 1.0; 
        let dx = Math.abs(myCarCenterX - obs.position.x);
        let dz = Math.abs(camera.position.z - obs.position.z);
        
        // Bateu (caixa da colisão ajustada para carro mais lento)
        if (dx < 3.0 && dz < 6.0) {
            isGameOver = true;
            gameOverScreen.style.display = 'flex';
        }

        // Deletou
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

// Start
init();
