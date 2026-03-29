const initialTextShooterState = () => ({
  turn: 1,
  arousal: 0,
  endurance: 100,
  technique: 2,
  wave: 1,
  score: 0,
  finished: false,
});

const textShooter = {
  state: initialTextShooterState(),
  objectiveTitle: document.getElementById("objectiveTitle"),
  objectiveMeta: document.getElementById("objectiveMeta"),
  narrativeBox: document.getElementById("narrativeBox"),
  logList: document.getElementById("textShooterLog"),
  restartButton: document.getElementById("textShooterRestart"),
  actionButtons: Array.from(document.querySelectorAll(".action-button")),
  values: {
    turn: document.getElementById("turnValue"),
    hp: document.getElementById("hpValue"),
    shield: document.getElementById("shieldValue"),
    ammo: document.getElementById("ammoValue"),
    wave: document.getElementById("waveValue"),
    score: document.getElementById("scoreValue"),
  },
};

const ACTION_POOL = {
  猛力撸: {
    title: "猛力撸动",
    lines: ["你死死握紧滚烫鸡巴，粗暴猛套，龟头紫红发亮，骚水咕啾狂喷。"],
    effect: "兴奋值 +25，手法 -1，快感 +30~38",
    apply(state) {
      const next = { ...state };
      if (next.technique <= 0) { next.endurance -= 30; return { state: next, detail: "手酸发抖，鸡巴却硬得发疼。" }; }
      next.technique -= 1;
      next.arousal += 25;
      next.score += 30 + next.wave * 8;
      if (Math.random() < 0.45) next.wave += 1;
      return { state: next, detail: randomFrom(this.lines) };
    }
  },
  边缘控: {
    title: "边缘控制",
    lines: ["鸡巴快射时死捏根部，龟头胀紫，精液在马眼里打转却被憋回去。"],
    effect: "兴奋值 -15，持久度 +22，快感 +15",
    apply(state) {
      const next = { ...state };
      next.arousal = Math.max(0, next.arousal - 15);
      next.endurance = Math.min(100, next.endurance + 22);
      next.score += 15;
      return { state: next, detail: randomFrom(this.lines) };
    }
  },
  龟头玩: {
    title: "精细龟头",
    lines: ["两根手指死抠马眼和冠状沟，慢慢旋转，龟头又红又肿骚水直冒。"],
    effect: "兴奋值 +18，手法 +1，快感 +20",
    apply(state) {
      const next = { ...state };
      next.technique = Math.min(6, next.technique + 1);
      next.arousal += 18;
      next.score += 20;
      return { state: next, detail: randomFrom(this.lines) };
    }
  },
  蛋蛋揉: {
    title: "揉蛋蛋会阴",
    lines: ["一只手撸鸡巴，另一只手用力揉捏蛋蛋和会阴，酸爽直冲前列腺。"],
    effect: "兴奋值 +16，持久度 +10，快感 +18",
    apply(state) {
      const next = { ...state };
      next.arousal += 16;
      next.endurance = Math.min(100, next.endurance + 10);
      next.score += 18;
      return { state: next, detail: randomFrom(this.lines) };
    }
  },
  黑丝足: {
    title: "黑丝足交幻想",
    lines: ["幻想黑丝脚掌猛夹鸡巴，丝袜摩擦又滑又痒，脚趾死抠龟头。"],
    effect: "兴奋值 +24，持久度 -10，快感 +28",
    apply(state) {
      const next = { ...state };
      next.arousal += 24;
      next.endurance = Math.max(10, next.endurance - 10);
      next.score += 28;
      return { state: next, detail: randomFrom(this.lines) };
    }
  },
  女上位: {
    title: "女上位骑乘幻想",
    lines: ["幻想骚女骑在身上，湿滑骚穴一口吞下整根鸡巴，疯狂套弄。"],
    effect: "兴奋值 +28，持久度 -18，快感 +32",
    apply(state) {
      const next = { ...state };
      next.arousal += 28;
      next.endurance = Math.max(5, next.endurance - 18);
      next.score += 32;
      if (Math.random() < 0.5) next.wave += 1;
      return { state: next, detail: randomFrom(this.lines) };
    }
  },
  深喉口: {
    title: "深喉口交幻想",
    lines: ["幻想小骚货跪在胯下，喉咙深喉整根鸡巴，口水拉丝滴蛋蛋。"],
    effect: "兴奋值 +23，手法 +1，快感 +26",
    apply(state) {
      const next = { ...state };
      next.technique = Math.min(6, next.technique + 1);
      next.arousal += 23;
      next.score += 26;
      return { state: next, detail: randomFrom(this.lines) };
    }
  },
  触手缠: {
    title: "触手缠绕幻想",
    lines: ["幻想湿滑触手缠满鸡巴，吸盘吸龟头并钻进马眼搅动。"],
    effect: "兴奋值 +30，持久度 -22，快感 +35",
    apply(state) {
      const next = { ...state };
      next.arousal += 30;
      next.endurance = Math.max(5, next.endurance - 22);
      next.score += 35;
      if (Math.random() < 0.6) next.wave += 1;
      return { state: next, detail: randomFrom(this.lines) };
    }
  },
  喝蓝药: {
    title: "喝持久蓝药",
    lines: ["你拿起蓝色小药瓶，一口灌下，冰凉液体迅速流遍下体，持久度大幅恢复。"],
    effect: "持久度 +40，手法 +1，快感 +5",
    apply(state) {
      const next = { ...state };
      next.endurance = Math.min(100, next.endurance + 40);
      next.technique = Math.min(6, next.technique + 1);
      next.score += 5;
      return { state: next, detail: randomFrom(this.lines) };
    }
  },
  喝红药: {
    title: "喝兴奋红药",
    lines: ["你吞下红色小药丸，身体瞬间发热，鸡巴跳动得更猛烈，兴奋值快速上升。"],
    effect: "兴奋值 +22，持久度 -8，快感 +25",
    apply(state) {
      const next = { ...state };
      next.arousal += 22;
      next.endurance = Math.max(10, next.endurance - 8);
      next.score += 25;
      return { state: next, detail: randomFrom(this.lines) };
    }
  }
};

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getRandomActions(count = 4) {
  const keys = Object.keys(ACTION_POOL);
  const shuffled = keys.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(key => ({ key, ...ACTION_POOL[key] }));
}

function updateActionButtons(actions) {
  textShooter.actionButtons.forEach((btn, i) => {
    if (actions[i]) {
      btn.textContent = actions[i].title;
      btn.dataset.action = actions[i].key;
    }
  });
}

function appendLog(title, content) {
  const entry = document.createElement("div");
  entry.className = "log-item";
  entry.innerHTML = `<strong>${title}</strong><p>${content}</p>`;
  textShooter.logList.prepend(entry);
}

function updateTextShooterView() {
  const s = textShooter.state;
  textShooter.values.turn.textContent = String(s.turn);
  textShooter.values.hp.textContent = String(Math.max(0, s.arousal));
  textShooter.values.shield.textContent = String(Math.max(0, s.endurance));
  textShooter.values.ammo.textContent = String(Math.max(0, s.technique));
  textShooter.values.wave.textContent = String(s.wave);
  textShooter.values.score.textContent = String(s.score);
}

function setTextShooterFinished(message, subMessage) {
  textShooter.state.finished = true;
  textShooter.objectiveTitle.textContent = message;
  textShooter.objectiveMeta.textContent = subMessage;
  textShooter.actionButtons.forEach(btn => btn.classList.add("is-disabled"));
}

function maybeApplyEnemyPressure(state) {
  const next = { ...state };
  const pressure = Math.random();
  if (pressure < 0.32) {
    next.endurance = Math.max(0, next.endurance - 18);
    return { state: next, text: "快感爆棚，鸡巴跳动失控，持久度狂掉。" };
  }
  if (pressure > 0.82) {
    next.arousal += 11;
    next.score += 18;
    return { state: next, text: "敏感点突然被刺激，骚爽感直接拉满。" };
  }
  return { state: next, text: "快感继续堆积，鸡巴又硬又烫。" };
}

function runTextTurn(actionKey) {
  if (textShooter.state.finished) return;
  const actionData = ACTION_POOL[actionKey];
  if (!actionData) return;

  const firstPass = actionData.apply(textShooter.state);
  const secondPass = maybeApplyEnemyPressure(firstPass.state);

  const nextState = {
    ...secondPass.state,
    turn: secondPass.state.turn + 1,
  };

  textShooter.state = nextState;
  textShooter.narrativeBox.textContent = `${firstPass.detail} ${secondPass.text} (${actionData.effect})`;
  appendLog(`第 ${nextState.turn - 1} 回合 · ${actionData.title}`, textShooter.narrativeBox.textContent);

  if (nextState.arousal >= 100) {
    updateTextShooterView();
    setTextShooterFinished("高潮喷射！", "鸡巴猛抖，浓稠精液狂射满手满腹，爽到全身抽搐。");
    return;
  }
  if (nextState.endurance <= 0) {
    updateTextShooterView();
    setTextShooterFinished("提前疲软", "鸡巴还没射就软了，留下满满遗憾和一手黏液。");
    return;
  }
  if (nextState.turn > 10) {
    updateTextShooterView();
    setTextShooterFinished("持久高潮", "你成功撑到最后，鸡巴胀得发紫，快感积累极高。");
    return;
  }

  updateTextShooterView();
  const newActions = getRandomActions(4);
  updateActionButtons(newActions);
}

function resetTextShooter() {
  textShooter.state = initialTextShooterState();
  textShooter.narrativeBox.textContent = "你躺在床上，鸡巴完全硬起，龟头渗出骚水，右手慢慢握上去。今晚的打飞机正式开干。";
  textShooter.objectiveTitle.textContent = "把兴奋值冲到100";
  textShooter.objectiveMeta.textContent = "尽量保持持久度，别让鸡巴提前软掉。";
  textShooter.logList.innerHTML = "";
  textShooter.actionButtons.forEach(btn => btn.classList.remove("is-disabled"));
  updateTextShooterView();
  appendLog("开始", "今晚打飞机已就绪，鸡巴已硬。");
  const initialActions = getRandomActions(4);
  updateActionButtons(initialActions);
}

textShooter.actionButtons.forEach(button => {
  button.addEventListener("click", () => runTextTurn(button.dataset.action));
});

textShooter.restartButton.addEventListener("click", resetTextShooter);

resetTextShooter();