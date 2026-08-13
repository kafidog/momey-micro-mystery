(function (global) {
  "use strict";

  /*
   * A8's only player-facing dialogue source.  The Worker sends event IDs;
   * this table supplies the matching caption and frozen local audio asset.
   * Unchanged A7 lines and all A8 additions use the accepted
   * Kokoro-82M-v1.1-zh / zm_010 static voice chain.
   */
  var DIALOGUE = [
    {
      DIALOGUE_ID: "A8_INTRO_01",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "INTRO_1",
      CAPTION_TEXT: "海岬防洪站保護控制室，也保護海岸不被暴雨海水沖進來。",
      VOICE_TEXT: "海岬防洪站保護控制室和海岸。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_01.mp3",
      MEANING_TAG: "place"
    },
    {
      DIALOGUE_ID: "A8_INTRO_02",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "INTRO_2",
      CAPTION_TEXT: "林芮是維修員。她在西側維修隧道檢查西側救援軌道；事故後，她被困在高處避難台。",
      VOICE_TEXT: "林芮是維修員，在西側維修隧道檢查救援軌道，現在在高處避難台。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_02.mp3",
      MEANING_TAG: "lin-rui"
    },
    {
      DIALOGUE_ID: "A8_INTRO_03",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "INTRO_3",
      CAPTION_TEXT: "高承是閘門技師。他在中央隔離閘東側，手上握著手動撐桿。",
      VOICE_TEXT: "高承是閘門技師，在中央隔離閘東側握著手動撐桿。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_03.mp3",
      MEANING_TAG: "gao-cheng"
    },
    {
      DIALOGUE_ID: "A8_INTRO_04",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "INTRO_4",
      CAPTION_TEXT: "管線破裂，電力和主要系統失去作用；海水與污染開始從東側往高承和閘門移動。",
      VOICE_TEXT: "管線破裂，電力和主要系統失效；海水與污染從東側往高承和閘門移動。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_04.mp3",
      MEANING_TAG: "incident"
    },
    {
      DIALOGUE_ID: "A8_INTRO_05",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "INTRO_5",
      CAPTION_TEXT: "控制室無法確認林芮目前的狀態和路線，也無法確認高承和中央隔離閘還能安全多久。",
      VOICE_TEXT: "控制室不知道林芮的狀態和路線，也不知道高承和閘門還能安全多久。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_05.mp3",
      MEANING_TAG: "lost-confirmation"
    },
    {
      DIALOGUE_ID: "A8_INTRO_06",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "INTRO_6",
      CAPTION_TEXT: "這張簡圖把控制室、林芮的高處避難台、高承的手動撐桿、中央隔離閘和西側救援軌道放在一起；海水與污染從東側靠近。",
      VOICE_TEXT: "簡圖標出控制室、兩人的位置、中央隔離閘和西側救援軌道；海水與污染從東側靠近。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_06.mp3",
      MEANING_TAG: "facility-map"
    },
    {
      DIALOGUE_ID: "A8_INTRO_07",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "INTRO_7",
      CAPTION_TEXT: "關上中央隔離閘：20 秒內保護控制室，高承可撤退；救援軌道斷電，林芮的救援車不能通過。再開 95 秒：救援車仍可能帶回林芮；高承必須留在手動撐桿旁，海水與污染持續靠近。",
      VOICE_TEXT: "關上隔離閘能保護控制室，卻讓林芮的救援車不能通過。再開 95 秒保留救援可能，但危險會繼續靠近高承。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_07.mp3",
      MEANING_TAG: "tradeoff"
    },
    {
      DIALOGUE_ID: "A8_INTRO_08",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "INTRO_8",
      CAPTION_TEXT: "現在由三人組成應變小組：每人拿一支手機、接手一個角色、查一件事；所有發現都能分享，最後一起選擇。",
      VOICE_TEXT: "三人組成應變小組，一人一支手機，查一件事，分享所有發現，最後一起選擇。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_08.mp3",
      MEANING_TAG: "team"
    },
    {
      DIALOGUE_ID: "A8_ROLE_START",
      STAGE: "ROLE",
      PROFILE: "ALL",
      TRIGGER: "TAKEOVER",
      CAPTION_TEXT: "你已接手一個角色。先查一件事，再把結果告訴應變小組。",
      VOICE_TEXT: "你已接手一個角色，先查一件事，再告訴應變小組。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_role_start.mp3",
      MEANING_TAG: "role-transition"
    },
    {
      DIALOGUE_ID: "A8_ROUND1_REPORT",
      STAGE: "ROUND1_DISCUSS",
      PROFILE: "ALL",
      TRIGGER: "ALL_ACTIONS_DONE",
      CAPTION_TEXT: "三個人的查詢都完成了。先交換各自查到的和仍不知道的，再決定怎麼應變。",
      VOICE_TEXT: "三個人的查詢都完成了。先交換各自查到的和仍不知道的，再決定怎麼應變。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_round1_report.mp3",
      MEANING_TAG: "round-one-report"
    },
    {
      DIALOGUE_ID: "A8_ROUND2_REPORT_BREAKLINE",
      STAGE: "ROUND2_DISCUSS",
      PROFILE: "BREAKLINE",
      TRIGGER: "ALL_INTERVENTIONS_DONE",
      CAPTION_TEXT: "中央隔離閘的壓力開始往上跳。你們的應變改變了電力、救援路線和高承的位置；下一段只能保住一個最後窗口。",
      VOICE_TEXT: "中央隔離閘的壓力開始往上跳。你們的應變改變了電力、救援路線和高承的位置；下一段只能保住一個最後窗口。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_round2_report_breakline.mp3",
      MEANING_TAG: "round-two-report"
    },
    {
      DIALOGUE_ID: "A8_ROUND2_REPORT_BACKWASH",
      STAGE: "ROUND2_DISCUSS",
      PROFILE: "BACKWASH",
      TRIGGER: "ALL_INTERVENTIONS_DONE",
      CAPTION_TEXT: "東側海水已經漫過第一個低點。你們的應變改變了救援路線，也改變高承能留下多久；下一段不會再等。",
      VOICE_TEXT: "東側海水已經漫過第一個低點。你們的應變改變了救援路線，也改變高承能留下多久；下一段不會再等。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_round2_report_backwash.mp3",
      MEANING_TAG: "round-two-report"
    },
    {
      DIALOGUE_ID: "A8_ROUND3_ESCALATION_BREAKLINE",
      STAGE: "ROUND3_ACTION",
      PROFILE: "BREAKLINE",
      TRIGGER: "LAST_WINDOW",
      CAPTION_TEXT: "中央隔離閘的壓力突然升高。下一次操作會把剩下的電力、救援路線或高承安全推到最後一格。",
      VOICE_TEXT: "中央隔離閘的壓力突然升高。下一次操作會把剩下的電力、救援路線或高承安全推到最後一格。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_round3_escalation_breakline.mp3",
      MEANING_TAG: "round-three-escalation"
    },
    {
      DIALOGUE_ID: "A8_ROUND3_ESCALATION_BACKWASH",
      STAGE: "ROUND3_ACTION",
      PROFILE: "BACKWASH",
      TRIGGER: "LAST_WINDOW",
      CAPTION_TEXT: "東側海水已經漫過第一個低點。救援車可以前進，但每一個轉彎都會放大時間和防護的代價。",
      VOICE_TEXT: "東側海水已經漫過第一個低點。救援車可以前進，但每一個轉彎都會放大時間和防護的代價。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_round3_escalation_backwash.mp3",
      MEANING_TAG: "round-three-escalation"
    },
    {
      DIALOGUE_ID: "A8_ROUND3_REPORT_BREAKLINE",
      STAGE: "ROUND3_DISCUSS",
      PROFILE: "BREAKLINE",
      TRIGGER: "LAST_ACTIONS_DONE",
      CAPTION_TEXT: "第三回合的最後窗口已經用掉。請先交換三個做法造成的代價，再一起選擇中央隔離閘的最後動作。",
      VOICE_TEXT: "第三回合的最後窗口已經用掉。請先交換三個做法造成的代價，再一起選擇中央隔離閘的最後動作。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_round3_report_breakline.mp3",
      MEANING_TAG: "round-three-report"
    },
    {
      DIALOGUE_ID: "A8_ROUND3_REPORT_BACKWASH",
      STAGE: "ROUND3_DISCUSS",
      PROFILE: "BACKWASH",
      TRIGGER: "LAST_ACTIONS_DONE",
      CAPTION_TEXT: "第三回合的最後窗口已經用掉。請先交換三個做法造成的代價，再一起選擇中央隔離閘的最後動作。",
      VOICE_TEXT: "第三回合的最後窗口已經用掉。請先交換三個做法造成的代價，再一起選擇中央隔離閘的最後動作。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_round3_report_backwash.mp3",
      MEANING_TAG: "round-three-report"
    },
    {
      DIALOGUE_ID: "A8_ENDING_BREAKLINE_CLOSE_SAFE",
      STAGE: "ENDING",
      PROFILE: "BREAKLINE",
      TRIGGER: "BREAKLINE_CLOSE_SAFE",
      CAPTION_TEXT: "因為你們先前把電力留給中央隔離閘，也讓高承撤到遮蔽處，所以現在關上中央隔離閘；控制室和高承保住，林芮只能等外側救援隊。",
      VOICE_TEXT: "因為你們先前把電力留給中央隔離閘，也讓高承撤到遮蔽處，所以現在關上中央隔離閘；控制室和高承保住，林芮只能等外側救援隊。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_ending_breakline_close_safe.mp3",
      MEANING_TAG: "ending"
    },
    {
      DIALOGUE_ID: "A8_ENDING_BREAKLINE_CLOSE_EXPOSED",
      STAGE: "ENDING",
      PROFILE: "BREAKLINE",
      TRIGGER: "BREAKLINE_CLOSE_EXPOSED",
      CAPTION_TEXT: "因為你們先前沒有留住足夠的防護，所以現在關上中央隔離閘；西側救援軌道失去供電，林芮的主要路線中斷，高承帶傷撤出。",
      VOICE_TEXT: "因為你們先前沒有留住足夠的防護，所以現在關上中央隔離閘；西側救援軌道失去供電，林芮的主要路線中斷，高承帶傷撤出。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_ending_breakline_close_exposed.mp3",
      MEANING_TAG: "ending"
    },
    {
      DIALOGUE_ID: "A8_ENDING_BREAKLINE_HOLD_RETURN",
      STAGE: "ENDING",
      PROFILE: "BREAKLINE",
      TRIGGER: "BREAKLINE_HOLD_RETURN",
      CAPTION_TEXT: "因為你們先前讓救援車沿確認路線前進，也保住高承，所以讓中央隔離閘再開 95 秒；林芮上車，高承在閘門關閉前撤出。",
      VOICE_TEXT: "因為你們先前讓救援車沿確認路線前進，也保住高承，所以讓中央隔離閘再開 95 秒；林芮上車，高承在閘門關閉前撤出。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_ending_breakline_hold_return.mp3",
      MEANING_TAG: "ending"
    },
    {
      DIALOGUE_ID: "A8_ENDING_BREAKLINE_HOLD_LOSS",
      STAGE: "ENDING",
      PROFILE: "BREAKLINE",
      TRIGGER: "BREAKLINE_HOLD_LOSS",
      CAPTION_TEXT: "因為你們先前沒有留下足夠的救援進度或防護，所以讓中央隔離閘再開 95 秒；救援車帶回林芮，但高承在撐桿失效前後受到致命暴露。",
      VOICE_TEXT: "因為你們先前沒有留下足夠的救援進度或防護，所以讓中央隔離閘再開 95 秒；救援車帶回林芮，但高承在撐桿失效前後受到致命暴露。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_ending_breakline_hold_loss.mp3",
      MEANING_TAG: "ending"
    },
    {
      DIALOGUE_ID: "A8_ENDING_BACKWASH_CLOSE_ROUTE",
      STAGE: "ENDING",
      PROFILE: "BACKWASH",
      TRIGGER: "BACKWASH_CLOSE_ROUTE",
      CAPTION_TEXT: "因為你們先前把救援路線推到可接手的位置，也保住高承，所以現在關上中央隔離閘；外側救援隊沿替代入口接回林芮，高承安全撤出。",
      VOICE_TEXT: "因為你們先前把救援路線推到可接手的位置，也保住高承，所以現在關上中央隔離閘；外側救援隊沿替代入口接回林芮，高承安全撤出。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_ending_backwash_close_route.mp3",
      MEANING_TAG: "ending"
    },
    {
      DIALOGUE_ID: "A8_ENDING_BACKWASH_CLOSE_DELAY",
      STAGE: "ENDING",
      PROFILE: "BACKWASH",
      TRIGGER: "BACKWASH_CLOSE_DELAY",
      CAPTION_TEXT: "因為你們先前沒有把救援路線推到可接手的位置，所以現在關上中央隔離閘；外側救援隊改走替代入口，林芮在安全空氣耗盡前被救回，高承安全撤出。",
      VOICE_TEXT: "因為你們先前沒有把救援路線推到可接手的位置，所以現在關上中央隔離閘；外側救援隊改走替代入口，林芮在安全空氣耗盡前被救回，高承安全撤出。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_ending_backwash_close_delay.mp3",
      MEANING_TAG: "ending"
    },
    {
      DIALOGUE_ID: "A8_ENDING_BACKWASH_HOLD_RETURN",
      STAGE: "ENDING",
      PROFILE: "BACKWASH",
      TRIGGER: "BACKWASH_HOLD_RETURN",
      CAPTION_TEXT: "因為你們先前讓救援車前進，也用防護和閘門穩定換到最後窗口，所以讓中央隔離閘再開 95 秒；林芮被帶回，高承在遮蔽下撤出。",
      VOICE_TEXT: "因為你們先前讓救援車前進，也用防護和閘門穩定換到最後窗口，所以讓中央隔離閘再開 95 秒；林芮被帶回，高承在遮蔽下撤出。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_ending_backwash_hold_return.mp3",
      MEANING_TAG: "ending"
    },
    {
      DIALOGUE_ID: "A8_ENDING_BACKWASH_HOLD_EXPOSED",
      STAGE: "ENDING",
      PROFILE: "BACKWASH",
      TRIGGER: "BACKWASH_HOLD_EXPOSED",
      CAPTION_TEXT: "因為你們先前的救援或防護沒有留下足夠餘裕，所以讓中央隔離閘再開 95 秒；林芮被救回，但高承因海水與污染暴露造成永久呼吸傷害。",
      VOICE_TEXT: "因為你們先前的救援或防護沒有留下足夠餘裕，所以讓中央隔離閘再開 95 秒；林芮被救回，但高承因海水與污染暴露造成永久呼吸傷害。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a8_ending_backwash_hold_exposed.mp3",
      MEANING_TAG: "ending"
    }
  ];

  global.MOMEY_A8_DIALOGUE = DIALOGUE;
})(window);
