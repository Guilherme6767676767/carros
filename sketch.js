let carroX;
let moedas;
let obstaculos;
let nivel;
let jogoAtivo;
let imgCarro;

function preload() {
  imgCarro = loadImage('carro.png');
}

function setup() {
  createCanvas(400, 600);
  resetJogo(); // Inicializa as variáveis
}

function resetJogo() {
  carroX = 180;
  moedas = 0;
  obstaculos = [];
  nivel = 1;
  jogoAtivo = true;
  loop(); // Reativa o desenho da tela
}

function draw() {
  background(0); // Fundo Preto

  if (jogoAtivo) {
    // --- MOVIMENTAÇÃO ---
    if (keyIsDown(LEFT_ARROW) && carroX > 0) carroX -= 5 + nivel;
    if (keyIsDown(RIGHT_ARROW) && carroX < width - 40) carroX += 5 + nivel;

    // --- DESENHAR CARRO DA IMAGEM ---
    image(imgCarro, carroX, 500, 40, 70);

    // --- GERAR OBSTÁCULOS ---
    if (frameCount % 60 == 0) {
      let larguraObs = random(60, 120);
      obstaculos.push({ x: random(0, width - larguraObs), y: -50, w: larguraObs });
    }

    // --- LÓGICA DOS OBSTÁCULOS ---
    for (let i = obstaculos.length - 1; i >= 0; i--) {
      let o = obstaculos[i];
      o.y += 4 + nivel;

      fill(40);
      stroke(255, 20, 147);
      strokeWeight(2);
      rect(o.x, o.y, o.w, 40, 8);

      // Colisão
      if (carroX < o.x + o.w && carroX + 40 > o.x && 500 < o.y + 40 && 570 > o.y) {
        jogoAtivo = false;
      }

      if (o.y > height) {
        obstaculos.splice(i, 1);
        moedas += 10;
        if (moedas % 100 == 0) nivel++;
      }
    }

    // HUD
    fill(255);
    noStroke();
    textSize(20);
    text("MOEDAS: " + moedas, 20, 30);
    text("NÍVEL: " + nivel, 20, 60);

  } else {
    // --- TELA DE GAME OVER ---
    fill(255, 20, 147);
    textAlign(CENTER);
    textSize(40);
    text("GAME OVER!", width / 2, height / 2 - 20);

    fill(255);
    textSize(20);
    text("Moedas Totais: " + moedas, width / 2, height / 2 + 20);
    text("Pressione ESPAÇO para Reiniciar", width / 2, height / 2 + 60);
    noLoop();
  }
}

// --- DETECTAR TECLA ESPAÇO PARA REINICIAR ---
function keyPressed() {
  if (key === ' ' && !jogoAtivo) {
    resetJogo();
  }
}
