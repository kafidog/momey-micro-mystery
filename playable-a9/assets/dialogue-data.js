(function (global) {
  "use strict";
  global.MOMEY_A9_DIALOGUE = Object.freeze({
    A9_INTRO: { stage: "INTRO", trigger: "all seats taken", caption: "林芮困在西側救援軌道，高承守著中央隔離閘。你們的三支手機分別控制電力、救援車與支撐。", spokenText: "林芮困在西側救援軌道。高承守著中央隔離閘。你們的三支手機，分別控制電力、救援車與支撐。", audio: "assets/audio/kokoro-zm-010/a9_intro.mp3" },
    A9_WINDOW1_START: { stage: "WINDOW1", trigger: "three training controls complete", caption: "第一段操作開始。救援車需要電，中央隔離閘需要支撐；請直接互相喊出你們看到的狀況。", spokenText: "第一段操作開始。救援車需要電，中央隔離閘需要支撐。請直接互相喊出你們看到的狀況。", audio: "assets/audio/kokoro-zm-010/a9_window1_start.mp3" },
    A9_WINDOW1_RESULT: { stage: "INTERLUDE", trigger: "Window 1 deadline", caption: "第一段操作結束。第二波即將到達；剛才留下的位置、電力與損傷都會保留。", spokenText: "第一段操作結束。第二波即將到達。剛才留下的位置、電力與損傷，都會保留。", audio: "assets/audio/kokoro-zm-010/a9_window1_result.mp3" },
    A9_WINDOW2_START: { stage: "WINDOW2", trigger: "interlude complete", caption: "第二波到達。第一段留下的救援位置、電力與閘門損傷全部保留。", spokenText: "第二波到達。第一段留下的救援位置、電力與閘門損傷，全部保留。", audio: "assets/audio/kokoro-zm-010/a9_window2_start.mp3" },
    A9_FINAL_START: { stage: "FINAL", trigger: "Window 2 deadline", caption: "最後協作窗口開始。救援聯絡確認界線，結構安全守住支撐，現場調度抓住關閘時機。", spokenText: "最後協作窗口開始。救援聯絡確認界線。結構安全守住支撐。現場調度抓住關閘時機。", audio: "assets/audio/kokoro-zm-010/a9_final_start.mp3" },
    A9_OUTCOME_COORDINATED_CLOSE: { stage: "OUTCOME", trigger: "COORDINATED_CLOSE", caption: "中央隔離閘完成關閉。林芮已由救援車帶離，高承也離開污染暴露。", spokenText: "中央隔離閘完成關閉。林芮已由救援車帶離。高承也離開污染暴露。", audio: "assets/audio/kokoro-zm-010/a9_outcome_coordinated.mp3" },
    A9_OUTCOME_CLOSE_GAO_HARM: { stage: "OUTCOME", trigger: "CLOSE_GAO_HARM", caption: "中央隔離閘完成關閉，林芮已帶離；高承在最後支撐中受到不可逆傷害。", spokenText: "中央隔離閘完成關閉。林芮已帶離。高承在最後支撐中，受到不可逆傷害。", audio: "assets/audio/kokoro-zm-010/a9_outcome_gao_harm.mp3" },
    A9_OUTCOME_RESCUE_WITH_GATE_DAMAGE: { stage: "OUTCOME", trigger: "RESCUE_WITH_GATE_DAMAGE", caption: "林芮已帶離，高承也撤出；中央隔離閘沒有完成關閉，站體持續受損。", spokenText: "林芮已帶離。高承也撤出。中央隔離閘沒有完成關閉，站體持續受損。", audio: "assets/audio/kokoro-zm-010/a9_outcome_gate_damage.mp3" },
    A9_OUTCOME_LIN_STRANDED: { stage: "OUTCOME", trigger: "LIN_STRANDED", caption: "高承離開暴露區，但林芮沒有在窗口結束前完成越界固定。", spokenText: "高承離開暴露區。但林芮沒有在窗口結束前，完成越界固定。", audio: "assets/audio/kokoro-zm-010/a9_outcome_lin_stranded.mp3" },
    A9_OUTCOME_BOTH_EXPOSED: { stage: "OUTCOME", trigger: "BOTH_EXPOSED", caption: "救援與支撐都沒有在窗口內完成；林芮與高承仍承受事件後果。", spokenText: "救援與支撐，都沒有在窗口內完成。林芮與高承，仍承受事件後果。", audio: "assets/audio/kokoro-zm-010/a9_outcome_both_exposed.mp3" }
  });
})(window);
