/* NEON RACER 3D - MAIN LOGIC (NON-MODULE VERSION) */
let scene, camera, renderer, clock;
let car, road, ground;
let obstacles = [], coins = [], buildings = [];
let speed = 0, distance = 0, isGameOver = false;

// Estado persistente
let totalCoins = parseInt(localStorage.getItem('moedas_carros')) || 0;
let carColor = parseInt(localStorage.getItem('active_car_color')) || 0xff1493;
let unlockedCars = JSON.parse(localStorage.getItem('unlocked_cars')) || [0];

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.002);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('game-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    createEnvironment();
    createPlayerCar();
    createLighting();

    window.addEventListener('resize', onWindowResize);
    document.getElementById('loading').style.display = 'none';
    
    animate();
}

function createEnvironment() {
    // Chão Noturno
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x030305 });
    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Estrada de Asfalto
    const roadGeo = new THREE.PlaneGeometry(22, 1000);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1, metalness: 0.5 });
    road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.05;
    scene.add(road);

    // Linhas Neon laterais
    const neonMat = new THREE.MeshBasicMaterial({ color: 0xff1493 });
    const lineGeo = new THREE.PlaneGeometry(0.4, 1000);
    
    const leftLine = new THREE.Mesh(lineGeo, neonMat);
    leftLine.rotation.x = -Math.PI / 2;
    leftLine.position.set(-10.5, 0.1, 0);
    scene.add(leftLine);

    const rightLine = leftLine.clone();
    rightLine.position.x = 10.5;
    scene.add(rightLine);
}

function createPlayerCar() {
    if(car) scene.remove(car);
    car = new THREE.Group();

    // Carro de Luxo Neo
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: carColor, metalness: 0.9, roughness: 0.1,
        emissive: carColor, emissiveIntensity: 0.2
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 5), bodyMat);
    body.position.y = 0.8;
    car.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 2.2), new THREE.MeshStandardMaterial({color: 0x050505}));
    cabin.position.set(0, 1.4, -0.2);
    car.add(cabin);

    // Rodas Neon
    const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
    wheelGeo.rotateZ(Math.PI/2);
    const neonRimMat = new THREE.MeshBasicMaterial({ color: 0xff1493 });

    [ [-1.3, 0.6, 1.8], [1.3, 0.6, 1.8], [-1.3, 0.6, -1.8], [1.3, 0.6, -1.8] ].forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, new THREE.MeshBasicMaterial({color:0x111111}));
        wheel.position.set(...pos);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,0.45,16), neonRimMat);
        rim.rotateZ(Math.PI/2);
        rim.position.set(...pos);
        car.add(wheel, rim);
    });

    scene.add(car);
}

function createLighting() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const sun = new THREE.DirectionalLight(0x4040ff, 0.5);
    sun.position.set(10, 20, 10);
    scene.add(sun);
}

// CONTROLES
const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

function handleInput(delta) {
    if(isGameOver) return;

    if(keys['ArrowUp'] || keys['KeyW']) speed += 1.5;
    else if(keys['ArrowDown'] || keys['KeyS']) speed -= 3.0;
    else speed *= 0.97;

    speed = Math.max(0, Math.min(speed, 180));

    if(keys['ArrowLeft'] || keys['KeyA']) car.position.x -= 20 * delta;
    if(keys['ArrowRight'] || keys['KeyD']) car.position.x += 20 * delta;
    
    car.position.x = Math.max(-9, Math.min(car.position.x, 9));
}

function updateGame() {
    if(isGameOver) return;

    const delta = clock.getDelta();
    handleInput(delta);

    const worldSpeed = speed / 10;
    distance += worldSpeed * 0.1;

    // Atualizar UI
    document.getElementById('speedometer').innerHTML = `${Math.floor(speed)}<br><span style="font-size:12px;color:#aaa">km/h</span>`;
    document.getElementById('score').innerText = `Moedas: ${totalCoins} | Dist: ${Math.floor(distance)}m`;

    // Steering Wheel Effect
    const steering = (keys['ArrowLeft'] || keys['KeyA']) ? -45 : (keys['ArrowRight'] || keys['KeyD']) ? 45 : 0;
    document.getElementById('steering-wheel').style.transform = `rotate(${steering}deg)`;

    // Spawn & Colisão
    if(Math.random() < 0.02 && obstacles.length < 5) spawnEnemy();
    
    for(let i = obstacles.length-1; i >= 0; i--) {
        obstacles[i].position.z += worldSpeed * 0.6;
        
        if(Math.abs(car.position.x - obstacles[i].position.x) < 2.5 && 
           Math.abs(car.position.z - obstacles[i].position.z) < 4) {
            triggerGameOver();
        }

        if(obstacles[i].position.z > 20) {
            scene.remove(obstacles[i]);
            obstacles.splice(i, 1);
        }
    }
}

function spawnEnemy() {
    const obs = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 4.5), new THREE.MeshStandardMaterial({color: 0x333333}));
    obs.position.set((Math.random()-0.5)*18, 1, -200);
    scene.add(obs);
    obstacles.push(obs);
}

function triggerGameOver() {
    isGameOver = true;
    localStorage.setItem('moedas_carros', totalCoins);
    document.getElementById('game-over').style.display = 'flex';
    document.getElementById('coin-result').innerText = `Você coletou ${totalCoins} moedas totais!`;
}

// LOJA & GARAGEM
window.openGarage = () => {
    document.getElementById('garage').style.display = 'flex';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('garage-coins').innerText = totalCoins;
};

window.closeGarage = () => {
    document.getElementById('garage').style.display = 'none';
};

window.buyCar = (id, price) => {
    const colors = [0xffffff, 0xff0000, 0x111111, 0xffd700];
    if (unlockedCars.includes(id)) {
        carColor = colors[id];
        localStorage.setItem('active_car_color', carColor);
        createPlayerCar();
        alert("Carro equipado!");
    } else if (totalCoins >= price) {
        totalCoins -= price;
        unlockedCars.push(id);
        carColor = colors[id];
        localStorage.setItem('moedas_carros', totalCoins);
        localStorage.setItem('unlocked_cars', JSON.stringify(unlockedCars));
        localStorage.setItem('active_car_color', carColor);
        document.getElementById('garage-coins').innerText = totalCoins;
        createPlayerCar();
        alert("Comprado e equipado!");
    } else {
        alert("Moedas insuficientes!");
    }
};

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
