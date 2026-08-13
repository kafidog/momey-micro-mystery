(function (global) {
  "use strict";
  global.MOMEY_A9R_DIALOGUE = Object.freeze({
    A9R_BRIEFING_1: { stage: "BRIEFING", caption: "海岬防洪站擋住暴潮與污染水，避免它們穿過站體進入沿岸設施。", spokenText: "海岬防洪站擋住暴潮與污染水，避免它們穿過站體，進入沿岸設施。", audio: "assets/audio/kokoro-zm-010/a9r_briefing_1.mp3" },
    A9R_BRIEFING_2: { stage: "BRIEFING", caption: "林芮檢查西側救援軌道時，壓力衝擊卡死回程。她困在污染區一側，只能靠救援車越過安全界線。", spokenText: "林芮是西側維修員。她檢查救援軌道時，壓力衝擊卡死回程。她困在污染區一側，只能靠救援車，越過安全界線。", audio: "assets/audio/kokoro-zm-010/a9r_briefing_2.mp3" },
    A9R_BRIEFING_3: { stage: "BRIEFING", caption: "高承趕到中央隔離閘處理故障。自動支撐失效，他留在閘旁手動承受負載，也持續接觸污染。", spokenText: "高承是閘門維護員。他趕到中央隔離閘處理故障。自動支撐失效，他留在閘旁手動承受負載，也持續接觸污染。", audio: "assets/audio/kokoro-zm-010/a9r_briefing_3.mp3" },
    A9R_BRIEFING_4: { stage: "BRIEFING", caption: "污染水正在西側事件區加壓；救援軌道與中央閘門必須共用有限的備用電力。", spokenText: "污染水正在西側事件區加壓。救援軌道與中央閘門，必須共用有限的備用電力。", audio: "assets/audio/kokoro-zm-010/a9r_briefing_4.mp3" },
    A9R_BRIEFING_5: { stage: "BRIEFING", caption: "關閘會封住污染區，也會切斷西側救援路線。太早關，林芮回不來；拖太久，高承與站體會承受傷害。", spokenText: "中央隔離閘一旦關閉，會封住污染區，也會切斷西側救援路線。太早關，林芮回不來。拖太久，高承與站體會承受傷害。", audio: "assets/audio/kokoro-zm-010/a9r_briefing_5.mp3" },
    A9R_BRIEFING_6: { stage: "BRIEFING", caption: "你們分別控制電力與關閘、林芮的救援車、以及高承的支撐。移動林芮、保護高承，再一起抓住安全關閘時機。", spokenText: "你們三個，控制同一場救援。現場調度控制電力與關閘。救援聯絡移動林芮。結構安全保護高承。一起抓住安全關閘的時機。", audio: "assets/audio/kokoro-zm-010/a9r_briefing_6.mp3" },
    A9R_TRAINING_COMPLETE: { stage: "TRAINING", caption: "排演完成。你剛才的操作改變了隊友的控制台；現在用喊話把三個控制接起來。", spokenText: "排演完成。你剛才的操作，改變了隊友的控制台。現在，用喊話把三個控制接起來。", audio: "assets/audio/kokoro-zm-010/a9r_training_complete.mp3" },
    A9_WINDOW1_START: { stage: "WINDOW1", caption: "第一段操作開始。救援車需要電，中央隔離閘需要支撐；請直接互相喊出你們看到的狀況。", spokenText: "第一段操作開始。救援車需要電，中央隔離閘需要支撐。請直接互相喊出你們看到的狀況。", audio: "assets/audio/kokoro-zm-010/a9_window1_start.mp3" },
    A9_WINDOW1_RESULT: { stage: "INTERLUDE", caption: "第一段操作結束。第二波即將到達；剛才留下的位置、電力與損傷都會保留。", spokenText: "第一段操作結束。第二波即將到達。剛才留下的位置、電力與損傷，都會保留。", audio: "assets/audio/kokoro-zm-010/a9_window1_result.mp3" },
    A9_WINDOW2_START: { stage: "WINDOW2", caption: "第二波到達。第一段留下的救援位置、電力與閘門損傷全部保留。", spokenText: "第二波到達。第一段留下的救援位置、電力與閘門損傷，全部保留。", audio: "assets/audio/kokoro-zm-010/a9_window2_start.mp3" },
    A9_FINAL_START: { stage: "FINAL", caption: "最後協作窗口開始。救援聯絡確認界線，結構安全守住支撐，現場調度抓住關閘時機。", spokenText: "最後協作窗口開始。救援聯絡確認界線。結構安全守住支撐。現場調度抓住關閘時機。", audio: "assets/audio/kokoro-zm-010/a9_final_start.mp3" },
    A9_OUTCOME_COORDINATED_CLOSE: { stage: "OUTCOME", caption: "中央隔離閘完成關閉。林芮已由救援車帶離，高承也離開污染暴露。", spokenText: "中央隔離閘完成關閉。林芮已由救援車帶離。高承也離開污染暴露。", audio: "assets/audio/kokoro-zm-010/a9_outcome_coordinated.mp3" },
    A9_OUTCOME_CLOSE_GAO_HARM: { stage: "OUTCOME", caption: "中央隔離閘完成關閉，林芮已帶離；高承在最後支撐中受到不可逆傷害。", spokenText: "中央隔離閘完成關閉。林芮已帶離。高承在最後支撐中，受到不可逆傷害。", audio: "assets/audio/kokoro-zm-010/a9_outcome_gao_harm.mp3" },
    A9_OUTCOME_RESCUE_WITH_GATE_DAMAGE: { stage: "OUTCOME", caption: "林芮已帶離，高承也撤出；中央隔離閘沒有完成關閉，站體持續受損。", spokenText: "林芮已帶離。高承也撤出。中央隔離閘沒有完成關閉，站體持續受損。", audio: "assets/audio/kokoro-zm-010/a9_outcome_gate_damage.mp3" },
    A9_OUTCOME_LIN_STRANDED: { stage: "OUTCOME", caption: "高承離開暴露區，但林芮沒有在窗口結束前完成越界固定。", spokenText: "高承離開暴露區。但林芮沒有在窗口結束前，完成越界固定。", audio: "assets/audio/kokoro-zm-010/a9_outcome_lin_stranded.mp3" },
    A9_OUTCOME_BOTH_EXPOSED: { stage: "OUTCOME", caption: "救援與支撐都沒有在窗口內完成；林芮與高承仍承受事件後果。", spokenText: "救援與支撐，都沒有在窗口內完成。林芮與高承，仍承受事件後果。", audio: "assets/audio/kokoro-zm-010/a9_outcome_both_exposed.mp3" }
  });
})(window);
