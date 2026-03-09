import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let speed = 2.0;
let distance = 0;
let carPositionX = 0;
let steering = 0;
let moedas = parseInt(localStorage.getItem('moedas_carros')) || 0;
let activeCarColor = parseInt(localStorage.getItem('active_car_color')) || 0xaa0000;
let unlockedCars = JSON.parse(localStorage.getItem('unlocked_cars')) || [0]; 

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

// Materiais do cenario
const buildingGeo = new THREE.BoxGeometry(15, 60, 15);
const matRoad = new THREE.MeshBasicMaterial({ color: 0x2a2a2a }); 
const matMarker = new THREE.MeshBasicMaterial({ color: 0xffffff });
const matGrass = new THREE.MeshBasicMaterial({ color: 0x33aa33 }); 

// Modelo de Carro Realista (Placeholder procedural de altíssima fidelidade temporalmente para evitar dependência externa)
let enemyCarModel = new THREE.Group();
const carColors = [0xaa0000, 0x0000aa, 0xbbbbbb, 0x111111, 0xddaa00];

function init() {
    scene = new THREE.Scene();
    
    // SKYBOX REALISTA (Em vez de cor solida, usamos um gradiente gigante)
    const skyGeo = new THREE.SphereGeometry(600, 32, 15);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Névoa densa pra esconder o "fundo falso" que estava azulando o chão
    scene.fog = new THREE.FogExp2(0xb4d3e0, 0.003); 
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
    camera.position.set(-1.0, 1.25, 1.5); 

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    // Tone mapping pro sol ficar realista
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding;

    document.getElementById('game-container').appendChild(renderer.domElement);

    createEnvironment();
    createLighting();

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Carregar Modelo
    loadRealCarModel();
}

function createEnvironment() {
    roadGroup = new THREE.Group();
    scene.add(roadGroup);

    // Chão MUNDIAL (infinito para não bugar a cor nunca)
    const groundGeo = new THREE.PlaneGeometry(8000, 8000);
    const ground = new THREE.Mesh(groundGeo, matGrass);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    // Pista de Asfalto (Larga e Cinza realista)
    const roadGeo = new THREE.PlaneGeometry(35, 4000);
    const road = new THREE.Mesh(roadGeo, matRoad);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    scene.add(road);

    // Faixas
    const markerGeo = new THREE.PlaneGeometry(0.4, 8);
    for (let i = 0; i < 40; i++) { // Renderiza menos faixas mas mais compridas
        const markerL = new THREE.Mesh(markerGeo, matMarker);
        markerL.rotation.x = -Math.PI / 2;
        markerL.position.set(-6, 0.05, -i * 30);
        roadGroup.add(markerL);
        roadMarkers.push(markerL);

        const markerR = new THREE.Mesh(markerGeo, matMarker);
        markerR.rotation.x = -Math.PI / 2;
        markerR.position.set(6, 0.05, -i * 30);
        roadGroup.add(markerR);
        roadMarkers.push(markerR);
    }

    // Predios laterais (Cidade)
    const buildingMats = [
        new THREE.MeshLambertMaterial({color: 0x999999}),
        new THREE.MeshLambertMaterial({color: 0xbbbbbb}),
        new THREE.MeshLambertMaterial({color: 0xaabbcc})
    ];

    for(let i = 0; i < 60; i++) { // Mais predios na distancia
        let height = 30 + Math.random() * 60; // Predios mais altos
        let bMat = buildingMats[Math.floor(Math.random() * buildingMats.length)];
        
        let bLeft = new THREE.Mesh(buildingGeo, bMat);
        bLeft.scale.y = height / 60;
        bLeft.position.set(-45 - Math.random()*15, height/2, -i * 40);
        scene.add(bLeft);
        cityBuildings.push(bLeft);

        let bRight = new THREE.Mesh(buildingGeo, bMat);
        bRight.scale.y = height / 60;
        bRight.position.set(45 + Math.random()*15, height/2, -i * 40);
        scene.add(bRight);
        cityBuildings.push(bRight);
    }
}

function createLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7); // Luz do dia claro
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffee, 1.0);
    sun.position.set(200, 500, 100);
    scene.add(sun);
}

function loadRealCarModel() {
    // Carregando um modelo de um fusca/esportivo em GLTF via net
    // (URL Publico permissivo confiavel de exemplos do THREE.js ou low-poly comum)
    const loader = new GLTFLoader();
    
    // Substituindo pelo carregamento procedural muito mais detalhado
    const bodyMat = new THREE.MeshPhysicalMaterial({
        color: activeCarColor, metalness: 0.6, roughness: 0.4, clearcoat: 1.0
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x000000, metalness: 0.9, roughness: 0.1, transmission: 0.5
    });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    // Base/Chassi baixo e esguio (Esportivo)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.9, 9.5), bodyMat);
    chassis.position.y = 0.6;
    enemyCarModel.add(chassis);

    // Cabine aerodinamica
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 4.5), glassMat);
    cabin.position.set(0, 1.45, -0.5);
    enemyCarModel.add(cabin);
    
    // Frente inclinada (Capô esportivo)
    const hoodGeo = new THREE.BufferGeometry();
    // Simplified slope using a rotated box for performance but elegant look
    const capuz = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.4, 2.5), bodyMat);
    capuz.rotation.x = 0.15;
    capuz.position.set(0, 0.9, 3.5);
    enemyCarModel.add(capuz);
    
    // Rodas realistas de liga leve preta com pneus
    const wheelGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.6, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.8});
    
    [ [-2.1, 0.75, 2.8], [2.1, 0.75, 2.8], [-2.1, 0.75, -2.8], [2.1, 0.75, -2.8] ].forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, blackMat); // Pneu
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.62, 16), rimMat); // Roda
        rim.rotateZ(Math.PI/2);
        wheel.add(rim);
        wheel.position.set(...pos);
        enemyCarModel.add(wheel);
    });

    // Lanternas trazeiras LED e Farol
    const tailMat = new THREE.MeshBasicMaterial({color: 0xff0000});
    const tailL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.1), tailMat);
    tailL.position.set(-1.2, 0.8, -4.76);
    const tailR = tailL.clone();
    tailR.position.set(1.2, 0.8, -4.76);
    enemyCarModel.add(tailL, tailR);

    // Roda virada pra trás pro usuário (os carros andam na mesma direção ou contra? Na nossa ref, é na mesma)
    // Então faróis traseiros ficam de frente pra câmera
    
    // Tudo ok, esconde loading
    loadingScreen.style.display = 'none';
    animate();
}

// Controles
const keys = { left: false, right: false, up: false, down: false };
document.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
});
document.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
});

function spawnObstacle() {
    let obs = enemyCarModel.clone();
    
    // Troca a cor
    let randomColor = carColors[Math.floor(Math.random() * carColors.length)];
    obs.children[0].material = new THREE.MeshPhysicalMaterial({
        color: randomColor, metalness: 0.6, roughness: 0.4, clearcoat: 1.0
    });
    
    // Faixas
    const lane = (Math.floor(Math.random() * 3) - 1) * 12; // -12, 0 ou 12
    
    obs.position.set(lane, 0, camera.position.z - 300 - Math.random() * 200);
    // Velocidade realista de trafego rodoviario
    obs.userData.speedZ = (Math.random() * 3.0) + 2.0; 
    
    // Moeda Bônus flutuando as vezes! (Sistema de pontos)
    if(Math.random() > 0.5) {
        let coin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16),
            new THREE.MeshBasicMaterial({color: 0xffdd00})
        );
        coin.rotation.x = Math.PI/2;
        coin.position.set(0, 3.0, 0); // Acima do carro
        coin.userData.isCoin = true;
        obs.add(coin);
    }

    scene.add(obs);
    obstacles.push(obs);
}

function updateGame() {
    if (isGameOver) return;

    // FÍSICA E VELOCIDADE REALISTA (Acelera até velocidade máxima como de verdade)
    if (keys.up) speed += 0.12; // Aceleração mais agressiva
    if (keys.down) speed -= 0.25; // Freio forte
    if (!keys.up && !keys.down) speed *= 0.99; 

    // Velocidade de carro normal em highway (limite = 15.0 para sensação de 280km/h)
    speed = Math.max(0.0, Math.min(speed, 15.0)); 
    
    // Movimento do mundo
    camera.position.z -= speed;
    distance += speed / 10;
    
    let maxSteerSpeed = 0.5 * (speed / 5);
    if(speed < 1.0) maxSteerSpeed = 0;

    if (keys.left) carPositionX -= maxSteerSpeed;
    if (keys.right) carPositionX += maxSteerSpeed;
    
    carPositionX = Math.max(-13, Math.min(carPositionX, 13));
    
    // Câmera acompanha
    camera.position.x += ((carPositionX - 1.0) - camera.position.x) * 0.2; 
    
    let steerTarget = keys.left ? 0.06 : (keys.right ? -0.06 : 0);
    camera.rotation.z += (steerTarget - camera.rotation.z) * 0.15;
    camera.position.y = 1.25 + (Math.random() * (speed*0.003)); // Vibração de velocidade

    // Animação moedas
    obstacles.forEach(obs => {
        obs.children.forEach(c => {
            if(c.userData.isCoin) c.rotation.y += 0.1;
        });
    });

    // UI Updates
    steering = keys.left ? -65 : (keys.right ? 65 : 0);
    let currentRotation = parseFloat(steeringWheel.style.transform.replace(/[^0-9\-.,]/g, '').split(',')[2] || 0);
    if(isNaN(currentRotation)) currentRotation = 0;
    let newRot = currentRotation + (steering - currentRotation) * 0.3;
    
    steeringWheel.style.transform = `translateX(-50%) rotate(${newRot}deg)`;
    leftHand.style.transform = `rotate(${30 + newRot}deg) translateY(${Math.abs(newRot)*0.2}px)`;
    rightHand.style.transform = `rotate(${-30 + newRot}deg) translateY(${Math.abs(newRot)*0.2}px)`;

    // Convertendo vel virtual para KM/H visual realista
    speedText.innerHTML = `${Math.floor(speed * 18)}<br><span style="font-size:16px;color:#aaa">km/h</span>`;
    scoreText.innerHTML = `Moeadas: <span style="color:#ffdd00">${moedas}</span> | Dist: ${Math.floor(distance)}m`;

    mirrorReflect.style.backgroundPosition = `0px ${distance * 5}px`;

    // Looping ambiente
    roadMarkers.forEach(m => {
        if (m.position.z > camera.position.z + 10) m.position.z -= 1200;
    });
    cityBuildings.forEach(b => {
        if (b.position.z > camera.position.z + 20) b.position.z -= 2400;
    });

    // Trafego Spawner
    let spawnRate = 0.02 + (speed * 0.003); // Taxa mais razoavel
    if (Math.random() < spawnRate && obstacles.length < 15) {
        spawnObstacle();
    }

    // Colisão
    let myCarWidth = 4.0;
    let enemyWidth = 4.0; 

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        
        // Inimigo anda na mesma direção, mas mais devagar
        obs.position.z -= obs.userData.speedZ;
        
        let myCenter = camera.position.x + 1.0; 
        let dx = Math.abs(myCenter - obs.position.x);
        let dz = Math.abs(camera.position.z - obs.position.z);
        
        // Coleta de moeda justa
        if(dx < 5.0 && Math.abs((camera.position.z - 5.0) - obs.position.z) < 5.0) {
            obs.children.forEach(c => {
                if(c.userData.isCoin && c.visible) {
                    c.visible = false;
                    moedas += 10;
                }
            });
        }
        
        // Bateu no CARRO (Frente do meu carro com a traseira dele)
        // O nariz do meu carro virtual está tipo uns z-4
        if (dx < 3.2 && dz < 7.5 && obs.position.z < camera.position.z - 2.0) {
            isGameOver = true;
            localStorage.setItem('moedas_carros', moedas); // Salva ao bater
            document.getElementById('coin-result').innerText = `Você coletou ${moedas} moedas ao todo!`;
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

init();

// LOGICA DE GARAGEM GLOBAL
window.openGarage = () => {
    document.getElementById('garage').style.display = 'flex';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('garage-coins').innerText = moedas;
};

window.closeGarage = () => {
    document.getElementById('garage').style.display = 'none';
    document.getElementById('game-over').style.display = 'flex';
};

window.buyCar = (id, price) => {
    const colors = [0xffffff, 0xff0000, 0x111111, 0xffd700];
    if (unlockedCars.includes(id)) {
        activeCarColor = colors[id];
        localStorage.setItem('active_car_color', activeCarColor);
        alert("Carro equipado! Recarregue a página para ver a mudança no capô.");
    } else if (moedas >= price) {
        moedas -= price;
        unlockedCars.push(id);
        activeCarColor = colors[id];
        localStorage.setItem('moedas_carros', moedas);
        localStorage.setItem('unlocked_cars', JSON.stringify(unlockedCars));
        localStorage.setItem('active_car_color', activeCarColor);
        document.getElementById('garage-coins').innerText = moedas;
        alert("Carro comprado e equipado! Recarregue a página para ver o novo visual.");
    } else {
        alert("Moedas insuficientes!");
    }
};
