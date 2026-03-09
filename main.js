import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let speed = 2.0;
let distance = 0;
let carPositionX = 0;
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
const loadingScreen = document.getElementById('loading');

// Car Model
let enemyCarModel = null;
const loader = new GLTFLoader();

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x111122, 0.008); // Neblina mais leve e suave
    
    // Câmera perfeitamente posicionada na visão do motorista
    camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(-1.0, 1.3, 1.5); // Deslocado pra esquerda (banco do motorista)

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Melhoramento de cor e realismo
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.getElementById('game-container').appendChild(renderer.domElement);

    createEnvironment();
    createLighting();

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Load Car Model BEFORE starting the game loop
    loadCarModel();
}

function loadCarModel() {
    // Usando um modelo GLTF de carro genérico gratuito de um CDN público focado em open source assets
    // Neste caso, vamos construir um carro em low-poly mas detalhado proceduralmente caso o link falhe,
    // Mas tentaremos carregar um shape realista via BoxGemoetries detalhados para garantir que funcione de imediato e sem CORS issues
    
    // Criar um modelo de carro realista procedural (melhor que um cubo)
    enemyCarModel = new THREE.Group();
    
    // Chassi
    const chassisGeo = new THREE.BoxGeometry(4.2, 1.2, 9);
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.8 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.8;
    chassis.castShadow = true;
    enemyCarModel.add(chassis);

    // Cabine do carro (Vidros e teto)
    const cabinGeo = new THREE.BoxGeometry(3.6, 1.0, 4.5);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.9, -0.5);
    cabin.castShadow = true;
    enemyCarModel.add(cabin);
    
    // Rodas
    const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.5, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    
    const positions = [
        [-2.2, 0.7, 2.5], [2.2, 0.7, 2.5], 
        [-2.2, 0.7, -3.0], [2.2, 0.7, -3.0]
    ];
    
    positions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(...pos);
        wheel.castShadow = true;
        enemyCarModel.add(wheel);
    });

    // Lanternas traseiras (Neon Red)
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const taillightL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.1), taillightMat);
    taillightL.position.set(-1.4, 1.0, 4.51);
    const taillightR = taillightL.clone();
    taillightR.position.set(1.4, 1.0, 4.51);
    
    // Efeito de brilho na lanterna
    const glowL = new THREE.PointLight(0xff0000, 1, 10);
    glowL.position.set(-1.4, 1.0, 5.0);
    const glowR = new THREE.PointLight(0xff0000, 1, 10);
    glowR.position.set(1.4, 1.0, 5.0);

    enemyCarModel.add(taillightL, taillightR, glowL, glowR);

    // Oculta tela de loading e inicia
    loadingScreen.style.display = 'none';
    animate();
}

function createEnvironment() {
    roadGroup = new THREE.Group();
    scene.add(roadGroup);

    // Chão (Deserto/Asfalto sujo infinito)
    const groundGeo = new THREE.PlaneGeometry(3000, 3000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1.0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    // Pista Principal (Asfalto realista com mais reflexo)
    const roadGeo = new THREE.PlaneGeometry(30, 3000);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.6, metalness: 0.1 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.receiveShadow = true;
    scene.add(road);

    // Detalhes da pista (Faixas)
    const markerGeo = new THREE.PlaneGeometry(0.4, 5);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
    
    for (let i = 0; i < 150; i++) {
        // Faixa Esquerda
        const markerL = new THREE.Mesh(markerGeo, markerMat);
        markerL.rotation.x = -Math.PI / 2;
        markerL.position.set(-5, 0.02, -i * 12);
        roadGroup.add(markerL);
        roadMarkers.push(markerL);

        // Faixa Direita
        const markerR = new THREE.Mesh(markerGeo, markerMat);
        markerR.rotation.x = -Math.PI / 2;
        markerR.position.set(5, 0.02, -i * 12);
        roadGroup.add(markerR);
        roadMarkers.push(markerR);
    }
}

function createLighting() {
    // Iluminação do céu noturno realista
    const ambientLight = new THREE.AmbientLight(0x10101a, 0.2); // Bem escuro
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x303055, 0.5); // Luz da lua
    dirLight.position.set(-100, 200, 50);
    scene.add(dirLight);

    // Faróis Ultra Realistas do nosso Carro Rosa (Luminosidade forte e quente)
    const headlightColor = 0xffeebb;
    
    const headlight1 = new THREE.SpotLight(headlightColor, 4, 400, Math.PI/6, 0.5, 1.5);
    headlight1.position.set(-2.5, 1.5, camera.position.z);
    headlight1.castShadow = true;
    headlight1.shadow.mapSize.width = 1024;
    headlight1.shadow.mapSize.height = 1024;
    scene.add(headlight1);
    scene.add(headlight1.target);

    const headlight2 = new THREE.SpotLight(headlightColor, 4, 400, Math.PI/6, 0.5, 1.5);
    headlight2.position.set(2.5, 1.5, camera.position.z);
    headlight2.castShadow = true;
    headlight2.shadow.mapSize.width = 1024;
    headlight2.shadow.mapSize.height = 1024;
    scene.add(headlight2);
    scene.add(headlight2.target);

    scene.userData.headlights = { L: headlight1, R: headlight2 };
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
    if(!enemyCarModel) return;

    // Clonar o modelo estático base
    const obs = enemyCarModel.clone();
    
    // Trocar a cor do chassi aleatoriamente
    const colors = [0x990000, 0x000099, 0x005500, 0x555555, 0xdddddd, 0x888800];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Percorre filhos para mudar a cor apenas do chassi (primeiro filho de mesh)
    obs.children[0].material = new THREE.MeshStandardMaterial({ 
        color: color, roughness: 0.1, metalness: 0.7 
    });
    
    // Posições realistas de faixa (-10, 0, 10 na pista de 30)
    const lane = (Math.floor(Math.random() * 3) - 1) * 10;
    
    obs.position.set(lane, 0, camera.position.z - 300 - Math.random() * 200);
    
    // Carros movem-se ligeiramente pra frente
    obs.userData.speedZ = (Math.random() * 1.5) + 0.5;

    scene.add(obs);
    obstacles.push(obs);
}

function updateGame() {
    if (isGameOver) return;

    // Aceleração
    if (keys.up) speed += 0.05;
    if (keys.down) speed -= 0.1;
    
    if (!keys.up && !keys.down) speed *= 0.99;

    speed = Math.max(0.0, Math.min(speed, 9.0)); 
    
    camera.position.z -= speed;
    distance += speed / 10;
    
    // Direção simulando a inércia realista de um carro (peso)
    let maxSteerSpeed = 0.3 * (speed / 4);
    if (keys.left) carPositionX -= maxSteerSpeed;
    if (keys.right) carPositionX += maxSteerSpeed;
    
    carPositionX = Math.max(-12, Math.min(carPositionX, 12));
    
    // Movimento suave da câmera pra acompanhar o volante e o carro
    camera.position.x += ((carPositionX - 1.0) - camera.position.x) * 0.1; 
    
    // Tilt realista, ao invés do carro apenas andar de lado, a câmera inclina (drift)
    let steerTarget = keys.left ? 0.05 : (keys.right ? -0.05 : 0);
    camera.rotation.z += (steerTarget - camera.rotation.z) * 0.1;
    // Vibrar levemente na alta velocidade
    camera.position.y = 1.3 + (Math.random() * (speed*0.005));

    // Faróis seguem a câmera estritamente
    const hl = scene.userData.headlights;
    if (hl) {
        hl.L.position.set(camera.position.x - 1.5, 1.5, camera.position.z);
        hl.L.target.position.set(camera.position.x - 1.5, 0, camera.position.z - 80);
        
        hl.R.position.set(camera.position.x + 3.5, 1.5, camera.position.z);
        hl.R.target.position.set(camera.position.x + 3.5, 0, camera.position.z - 80);
    }

    // UI
    steering = keys.left ? -60 : (keys.right ? 60 : 0);
    // Suavizar giro do volante
    let currentRotation = parseFloat(steeringWheel.style.transform.replace(/[^0-9\-.,]/g, '').split(',')[1] || 0);
    if(isNaN(currentRotation)) currentRotation = 0;
    let newRotation = currentRotation + (steering - currentRotation) * 0.1;
    steeringWheel.style.transform = `translateX(-50%) rotate(${newRotation}deg)`;

    // Km/h text (Multiplier to look realistic, ~150kmh max)
    speedText.innerText = Math.floor(speed * 18) + "\nkm/h";
    scoreText.innerText = "Dist: " + Math.floor(distance) + "m";

    // Loop na estrada
    roadMarkers.forEach(m => {
        if (m.position.z > camera.position.z + 10) {
            m.position.z -= 1800;
        }
    });

    // Spawner de tráfego denso
    let spawnRate = 0.05 + (speed * 0.01);
    if (Math.random() < spawnRate && obstacles.length < 30) {
        spawnObstacle();
    }

    // Lógica dos Carros e Colisão (Física aprimorada pro chassi de [4.2 x 9])
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        
        // Os carros se movem um pouco
        obs.position.z -= obs.userData.speedZ;
        
        // Câmera está no banco do motorista (X: -1.0 a partir do centro do nosso carro)
        // Largura do nosso carro = ~4.0, Comprimento = ~9.0
        let myCarCenterX = camera.position.x + 1.0; 
        
        let dx = Math.abs(myCarCenterX - obs.position.x);
        let dz = Math.abs(camera.position.z - obs.position.z);
        
        // Hitbox realista (4m de largura, 9m comprimento aproximado pro nosso carro e pro inimigo)
        if (dx < 4.0 && dz < 8.0) {
            isGameOver = true;
            gameOverScreen.style.display = 'flex';
        }

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

init();
