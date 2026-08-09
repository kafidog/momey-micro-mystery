"use strict";

const investigationForm = document.querySelector("#investigation-form");
const revealPanel = document.querySelector("#reveal-panel");
const resetButton = document.querySelector("#reset-button");
const selectionMessage = document.querySelector("#selection-message");

investigationForm.addEventListener("change", () => {
  selectionMessage.textContent = "線索已記錄。準備好後按下「揭曉真相」。";
});

investigationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const selectedClue = document.querySelector('input[name="clue"]:checked');
  if (!selectedClue) {
    selectionMessage.textContent = "請先選擇一項線索，再揭曉調查結果。";
    return;
  }

  selectionMessage.textContent = `你選擇了線索 ${selectedClue.value}。調查結果如下。`;
  revealPanel.hidden = false;
  resetButton.hidden = false;
  revealPanel.focus({ preventScroll: true });
});

resetButton.addEventListener("click", () => {
  investigationForm.reset();
  revealPanel.hidden = true;
  resetButton.hidden = true;
  selectionMessage.textContent = "先選一項線索，再揭曉調查結果。";
});
