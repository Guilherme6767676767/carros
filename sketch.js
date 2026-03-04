let carroX;
let carroY;
let velocidadeX;
let estadoJogo = "MENU"; // "MENU", "JOGANDO", "GAMEOVER", "LOJA"
let moedasTotais = 0; // Persistente
let moedasPartida;
let obstaculos;
let velocidadePista;
let nivel;
let scoreDistancia;

// Configuração dos Carros na Loja
let carroSelecionado = 0;
let carrosLoja = [
  { nome: "Rosa Retro", preco: 0, comprado: true, cor: [255, 50, 150], modelo: 0 },
  { nome: "Velocista Azul", preco: 500, comprado: false, cor: [50, 150, 255], modelo: 1 },
  { nome: "Besta Verde", preco: 1500, comprado: false, cor: [50, 255, 50], modelo: 2 },
  { nome: "Cyberpunk Raro", preco: 5000, comprado: false, cor: [20, 20, 20], modelo: 3, neon: [0, 255, 255] }
];

let linhasEstrada = [];
let particulas = [];
let predios = [];

function setup() {
  createCanvas(400, 600);

  // Tenta carregar moedas salvas
  let salvas = localStorage.getItem("moedasTotais");
  if (salvas) moedasTotais = parseInt(salvas);

  // Tenta carregar os carros comprados
  let carrosSalvos = localStorage.getItem("carrosLoja");
  if (carrosSalvos) carrosLoja = JSON.parse(carrosSalvos);

  // Tenta carregar carro selecionado
  let selecao = localStorage.getItem("carroSelecionado");
  if (selecao) carroSelecionado = parseInt(selecao);

  iniciarFundo();
}

function iniciarFundo() {
  linhasEstrada = [];
  predios = [];
  velocidadePista = 5;

  for (let i = -100; i < height + 100; i += 60) {
    linhasEstrada.push(i);
  }
  for (let i = 0; i < 8; i++) {
    gerarPredio(-random(height));
    gerarPredio(random(height));
  }
}

function iniciarPartida() {
  carroX = 200;
  carroY = 500;
  velocidadeX = 0;
  velocidadePista = 5;
  moedasPartida = 0;
  scoreDistancia = 0;
  obstaculos = [];
  particulas = [];
  nivel = 1;
  estadoJogo = "JOGANDO";
  iniciarFundo();
}



function draw() {
  if (estadoJogo === "MENU") {
    desenharCenarioFundo();
    desenharMenu();
  } else if (estadoJogo === "LOJA") {
    desenharCenarioFundo();
    desenharLoja();
  } else if (estadoJogo === "JOGANDO") {
    jogar();
  } else if (estadoJogo === "GAMEOVER") {
    desenharGameOver();
  }
}

function desenharCenarioFundo() {
  background(20, 10, 40);
  atualizarDesenharPredios();

  // ESTRADA
  fill(55);
  noStroke();
  rect(50, 0, 300, height);

  fill(200);
  rect(45, 0, 5, height);
  rect(350, 0, 5, height);

  fill(0, 255, 255);
  for (let i = 0; i < linhasEstrada.length; i++) {
    rect(width / 2 - 3, linhasEstrada[i], 6, 35);
    if (estadoJogo === "JOGANDO") linhasEstrada[i] += velocidadePista;
    if (linhasEstrada[i] > height) linhasEstrada[i] = -60;
  }
}

function jogar() {
  velocidadePista = 5 + (nivel * 0.8);
  scoreDistancia += velocidadePista / 100;

  // Nível sobe baseado na distância
  if (scoreDistancia > nivel * 15) {
    nivel++;
  }

  desenharCenarioFundo();

  // --- CONTROLES E FÍSICA DO CARRO ---
  let inclinacao = 0; // Para rotacionar o carro levemente ao virar
  if (keyIsDown(LEFT_ARROW)) {
    velocidadeX -= 0.6;
    inclinacao = -0.15;
  } else if (keyIsDown(RIGHT_ARROW)) {
    velocidadeX += 0.6;
    inclinacao = 0.15;
  } else {
    velocidadeX *= 0.85; // Atrito lateral
  }

  velocidadeX = constrain(velocidadeX, -7, 7);
  carroX += velocidadeX;

  // Colisão com as bordas da pista
  if (carroX < 65) {
    carroX = 65;
    velocidadeX = 0;
    gerarFaiscas(carroX - 15, carroY + 10);
  }
  if (carroX > 335) {
    carroX = 335;
    velocidadeX = 0;
    gerarFaiscas(carroX + 15, carroY + 10);
  }

  // Marcas de pneu se derrapar (alta velocidade lateral)
  if (abs(velocidadeX) > 4) {
    particulas.push(new ParticulaFumaca(carroX - 15, carroY + 30, 20)); // Pneu esq
    particulas.push(new ParticulaFumaca(carroX + 15, carroY + 30, 20)); // Pneu dir
  }

  // Fumaça do escapamento motor
  if (frameCount % 3 === 0) {
    particulas.push(new ParticulaEscapamento(carroX - 8, carroY + 35));
    particulas.push(new ParticulaEscapamento(carroX + 8, carroY + 35));
  }

  // --- ATUALIZAR E DESENHAR PARTÍCULAS ---
  atualizarDesenharParticulas();

  // --- DESENHAR CARRO DO JOGADOR ---
  desenharCarro(carroX, carroY, carrosLoja[carroSelecionado], inclinacao);

  // --- GERENCIAR MOEDAS (SPAWN) ---
  if (frameCount % 180 === 0) {
    let fx = random([100, 200, 300]);
    obstaculos.push({ tipo: 'moeda', x: fx, y: -100 });
  }

  // --- GERAR OBSTÁCULOS E ITENS ---
  let frequenciaObstaculo = max(30, 90 - nivel * 5);
  if (frameCount % frequenciaObstaculo === 0) {
    let faixa = random([100, 200, 300]);
    obstaculos.push(new Obstaculo(faixa + random(-15, 15), -100));
  }

  // --- ATUALIZAR OBSTÁCULOS E MOEDAS ---
  for (let i = obstaculos.length - 1; i >= 0; i--) {
    let item = obstaculos[i];

    if (item.tipo === 'moeda') {
      item.y += velocidadePista; // desce com a pista

      // Desenha a moeda
      push();
      translate(item.x, item.y);
      rotate(frameCount * 0.1);
      fill(255, 215, 0);
      stroke(200, 150, 0);
      strokeWeight(2);
      ellipse(0, 0, 25, 30);
      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(16);
      text("$", 0, 0);
      pop();

      // Coleta da moeda (hitbox)
      if (abs(carroX - item.x) < 30 && abs(carroY - item.y) < 40) {
        moedasPartida += 10; // Rende 10 moedas
        obstaculos.splice(i, 1);
        // Efeito de brilho
        for (let j = 0; j < 5; j++) gerarFaiscas(item.x, item.y, true);
      } else if (item.y > height + 50) {
        obstaculos.splice(i, 1);
      }
    } else {
      // Lógica de CARROS OBSTÁCULOS
      item.atualizar();
      item.desenhar();

      let bateuX = abs(carroX - item.x) < 32;
      let bateuY = abs(carroY - item.y) < 60;

      if (bateuX && bateuY) {
        estadoJogo = "GAMEOVER";
        moedasTotais += moedasPartida;
        salvarProgresso();
        for (let j = 0; j < 30; j++) gerarFaiscas(carroX, carroY - 20, false);
      }

      if (item.y > height + 100) {
        obstaculos.splice(i, 1);
        scoreDistancia += 0.5; // Bônus por passar
      }
    }
  }

  // --- HUD (Interface) ---
  desenharHUD();
}

function desenharGameOver() {
  atualizarDesenharParticulas(); // Continua animando explosão
  desenharCarro(carroX, carroY, color(100), 0); // Carro destruido (cinza)

  fill(0, 180);
  rect(0, 0, width, height);

  fill(255, 50, 50);
  textAlign(CENTER);
  textSize(50);
  text("BATIDA!", width / 2, height / 2 - 60);

  fill(255);
  textSize(24);
  text("Distância: " + floor(scoreDistancia) + " km", width / 2, height / 2 - 10);

  fill(255, 215, 0);
  text("Moedas ganhas: " + moedasPartida, width / 2, height / 2 + 20);
  text("Moedas Totais: " + moedasTotais, width / 2, height / 2 + 50);

  if (frameCount % 60 < 30) {
    fill(255);
    textSize(20);
    text("Pressione ESPAÇO para Tentar Novamente", width / 2, height / 2 + 100);
    fill(100, 200, 255);
    text("Pressione M para o Menu", width / 2, height / 2 + 130);
  }
}

// --- CLASSES E FUNÇÕES DE DESENHO ---

function salvarProgresso() {
  localStorage.setItem("moedasTotais", moedasTotais);
  localStorage.setItem("carrosLoja", JSON.stringify(carrosLoja));
  localStorage.setItem("carroSelecionado", carroSelecionado);
}

// --- FUNÇÕES DE MENU E LOJA ---
function desenharMenu() {
  fill(0, 150);
  rect(0, 0, width, height);

  textAlign(CENTER);
  fill(0, 255, 255);
  textSize(45);
  text("NEON RACER", width / 2, height / 3);

  fill(255, 215, 0);
  textSize(24);
  text("Moedas: " + moedasTotais, width / 2, height / 3 + 40);

  // Botão Jogar
  fill(255, 20, 147);
  rect(width / 2 - 100, height / 2, 200, 50, 10);
  fill(255);
  textSize(24);
  text("JOGAR (Espaço)", width / 2, height / 2 + 35);

  // Botão Loja
  fill(50, 50, 150);
  rect(width / 2 - 100, height / 2 + 80, 200, 50, 10);
  fill(255);
  text("LOJA (L)", width / 2, height / 2 + 115);

  // Desenhar o carro atual na tela de menu
  let meuCarro = carrosLoja[carroSelecionado];
  desenharCarroModelado(width / 2, height - 100, meuCarro, 0);
}

let indexLoja = 0;
function desenharLoja() {
  fill(0, 200);
  rect(0, 0, width, height);

  textAlign(CENTER);
  fill(255, 20, 147);
  textSize(40);
  text("GARAGEM & LOJA", width / 2, 60);

  fill(255, 215, 0);
  textSize(24);
  text("Suas Moedas: " + moedasTotais, width / 2, 100);

  // Navegação
  fill(255);
  textSize(30);
  text("< seta esq        seta dir >", width / 2, height / 2 + 60);

  let carroBase = carrosLoja[indexLoja];

  // Exibir Carro
  push();
  scale(1.5);
  desenharCarroModelado(width / 3, height / 3, carroBase, frameCount * 0.05); // Roda devagar
  pop();

  // Info
  fill(255);
  textSize(28);
  text(carroBase.nome, width / 2, height / 2 + 120);

  if (carroBase.comprado) {
    if (carroSelecionado === indexLoja) {
      fill(50, 255, 50);
      text("SELECIONADO", width / 2, height / 2 + 170);
    } else {
      fill(255);
      text("Aperte ENTER para Equipar", width / 2, height / 2 + 170);
    }
  } else {
    if (moedasTotais >= carroBase.preco) {
      fill(255, 215, 0);
      text("Preço: " + carroBase.preco, width / 2, height / 2 + 160);
      fill(50, 255, 50);
      text("Aperte ENTER para COMPRAR", width / 2, height / 2 + 190);
    } else {
      fill(255, 50, 50);
      text("Preço: " + carroBase.preco + " (Faltam moedas)", width / 2, height / 2 + 170);
    }
  }

  fill(150);
  textSize(18);
  text("Pressione M para Voltar", width / 2, height - 30);
}

function desenharCarro(x, y, corInfo, angulo = 0) {
  // Chamado no jogo principal
  let dados;
  if (corInfo instanceof p5.Color) {
    // É um carro de obstáculo simples
    dados = { cor: [red(corInfo), green(corInfo), blue(corInfo)], modelo: 0 };
  } else {
    // É uma das opções já configuradas
    dados = corInfo;
  }
  desenharCarroModelado(x, y, dados, angulo);
}

function desenharCarroModelado(x, y, prop, angulo) {
  push();
  translate(x, y);
  rotate(angulo);

  // Sombra
  fill(0, 60);
  rect(-16, -30, 36, 68, 6);

  noStroke();
  // Pneus
  fill(15);
  rect(-22, -20, 8, 16, 2);
  rect(14, -20, 8, 16, 2);
  rect(-22, 15, 8, 16, 2);
  rect(14, 15, 8, 16, 2);

  // Corpo principal Customizado
  if (prop.modelo === 3) {
    // CYBERPUNK RARO
    fill(prop.cor);
    rect(-18, -35, 36, 75, 2); // Mais quadrado

    // Linhas neon na lataria
    stroke(prop.neon);
    strokeWeight(2);
    line(-10, -30, -10, 30);
    line(10, -30, 10, 30);
    noStroke();

    // Motor exposto
    fill(100);
    rect(-8, 20, 16, 15);
    fill(0, 255, 255);
    ellipse(0, 27, 8, 8); // Núcleo brilhante

  } else if (prop.modelo === 2) {
    // BESTA
    fill(prop.cor);
    rect(-20, -32, 40, 65, 4); // Mais largo
    fill(30);
    rect(-10, -35, 20, 15); // capô reforçado
  } else {
    // BASICO E OUTROS
    fill(prop.cor);
    rect(-18, -35, 36, 70, 8);
  }

  // Teto / Para-brisas
  fill(20, 20, 30);
  rect(-14, -15, 28, 26, 4);
  fill(150, 200, 255, 80);
  rect(-12, -13, 24, 8, 2);

  if (prop.modelo !== 3) {
    // Faróis Dianteiros padrão
    fill(255, 255, 200);
    ellipse(-10, -32, 8, 5);
    ellipse(10, -32, 8, 5);
  } else {
    // Faróis Cyberpunk
    fill(prop.neon);
    rect(-16, -35, 12, 4);
    rect(4, -35, 12, 4);
  }

  // Lanternas Traseiras
  fill(255, 0, 0);
  rect(-14, 32, 8, 3, 2);
  rect(6, 32, 8, 3, 2);

  pop();
}

class Obstaculo {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.velY = velocidadePista * random(0.5, 0.85); // Mais lentos que a pista
    this.cor = color(random(100, 255), random(50, 200), random(50, 255));
    this.tipo = random([1, 2, 3]); // Tipos diferentes de carros
  }

  atualizar() {
    // A velocidade aparente é a vel da pista menos a velocidade real do carro
    this.y += (velocidadePista - this.velY) + (nivel * 0.3);
  }

  desenhar() {
    desenharCarro(this.x, this.y, this.cor, 0);
  }
}

// --- SISTEMA DE PARTÍCULAS ---
class ParticulaEscapamento {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-0.5, 0.5);
    this.vy = random(1, 3);
    this.alpha = 150;
    this.tamanho = random(3, 6);
  }
  atualizar() {
    this.x += this.vx;
    this.y += this.vy + velocidadePista; // Fica para trás dependendo da pista
    this.alpha -= 5;
    this.tamanho += 0.2;
  }
  desenhar() {
    noStroke();
    fill(150, 150, 150, this.alpha);
    ellipse(this.x, this.y, this.tamanho);
  }
}

class ParticulaFumaca {
  constructor(x, y, corEscura) {
    this.x = x;
    this.y = y;
    this.alpha = 80;
    this.tamanho = 8;
    this.cor = corEscura;
  }
  atualizar() {
    this.y += velocidadePista; // Move junto com o asfalto
    this.alpha -= 2;
  }
  desenhar() {
    noStroke();
    fill(this.cor, this.cor, this.cor, this.alpha);
    ellipse(this.x, this.y, this.tamanho);
  }
}

class Faisca {
  constructor(x, y, amarelo = false) {
    this.x = x;
    this.y = y;
    this.vx = random(-5, 5);
    this.vy = random(-5, 5);
    this.vida = 255;
    this.amarelo = amarelo;
  }
  atualizar() {
    this.x += this.vx;
    this.y += this.vy + velocidadePista / 2;
    this.vida -= 15;
  }
  desenhar() {
    noStroke();
    if (this.amarelo) fill(255, 255, 0, this.vida);
    else fill(255, random(100, 255), 0, this.vida);
    ellipse(this.x, this.y, random(2, 5));
  }
}

function gerarFaiscas(x, y, amarelo = false) {
  particulas.push(new Faisca(x, y, amarelo));
}

function atualizarDesenharParticulas() {
  for (let i = particulas.length - 1; i >= 0; i--) {
    let p = particulas[i];
    p.atualizar();
    p.desenhar();

    // Remove partículas invisíveis
    if (p.alpha <= 0 || p.vida <= 0 || p.y > height + 50) {
      particulas.splice(i, 1);
    }
  }
}

function gerarPredio(yInicial) {
  let isLeft = random() > 0.5;
  predios.push({
    x: isLeft ? random(-20, 20) : random(340, 390),
    y: yInicial || -200,
    largura: random(30, 80),
    altura: random(100, 300),
    corBase: color(random(10, 30), random(10, 20), random(40, 60)), // Azul/Roxo escuro
    corNeon: color(random([0, 255]), random([0, 255]), 255), // Ciano, Magenta, Azul
    janelas: floor(random(4, 10)),
    padrao: floor(random(1, 4)) // Diferentes estilos de janela
  });
}

function atualizarDesenharPredios() {
  if (frameCount % 12 === 0) {
    gerarPredio();
  }

  for (let i = predios.length - 1; i >= 0; i--) {
    let p = predios[i];
    p.y += velocidadePista * 0.8; // Efeito parallax (prédios movem um pouco mais devagar que o chão)

    // Corpo do prédio (Sombra e profundidade)
    fill(0, 100);
    rect(p.x + 5, p.y + 5, p.largura, p.altura);

    fill(p.corBase);
    rect(p.x, p.y, p.largura, p.altura);

    // Contorno neon suave
    stroke(p.corNeon);
    strokeWeight(1);
    noFill();
    rect(p.x, p.y, p.largura, p.altura);
    noStroke();

    // Janelas Neon
    fill(p.corNeon);
    let altJanela = p.altura / p.janelas;

    for (let j = 0; j < p.janelas; j++) {
      let isAcesa = (j % p.padrao === 0);
      if (isAcesa) {
        rect(p.x + 10, p.y + j * altJanela + 10, p.largura - 20, altJanela - 15);
      }
    }

    if (p.y > height + 50) {
      predios.splice(i, 1);
    }
  }
}

function desenharHUD() {
  fill(0, 150);
  rect(10, 10, 140, 75, 8);

  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT);
  text("Nível: " + nivel, 20, 32);

  fill(255, 215, 0);
  text("Moedas: " + moedasPartida, 20, 55);

  fill(150, 200, 255);
  text("Dist: " + floor(scoreDistancia) + " km", 20, 78);

  // Velocímetro simples
  let velKmh = floor(velocidadePista * 12);
  fill(0, 150);
  rect(width - 90, 10, 80, 40, 8);
  fill(255, 50, 50);
  textSize(18);
  textAlign(CENTER);
  text(velKmh + " km/h", width - 50, 35);
}

function keyPressed() {
  if (estadoJogo === "MENU") {
    if (key === ' ') iniciarPartida();
    if (key === 'l' || key === 'L') estadoJogo = "LOJA";
  } else if (estadoJogo === "GAMEOVER") {
    if (key === ' ') iniciarPartida();
    if (key === 'm' || key === 'M') estadoJogo = "MENU";
  } else if (estadoJogo === "LOJA") {
    if (key === 'm' || key === 'M') estadoJogo = "MENU";
    if (keyCode === LEFT_ARROW) {
      indexLoja--;
      if (indexLoja < 0) indexLoja = carrosLoja.length - 1;
    }
    if (keyCode === RIGHT_ARROW) {
      indexLoja++;
      if (indexLoja >= carrosLoja.length) indexLoja = 0;
    }
    if (keyCode === ENTER) {
      let car = carrosLoja[indexLoja];
      if (car.comprado) {
        carroSelecionado = indexLoja;
        salvarProgresso();
      } else if (moedasTotais >= car.preco) {
        moedasTotais -= car.preco;
        car.comprado = true;
        carroSelecionado = indexLoja;
        salvarProgresso();
      }
    }
  }
}
