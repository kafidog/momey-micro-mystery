(function (global) {
  "use strict";

  /*
   * A7's only player-facing voice/caption source.
   *
   * The browser consumes this table; the checked-in JSON manifest is built from
   * it by tools/build_voice_manifest.cjs.  Keep the uppercase field names: they
   * make semantic audits and stale-clip checks unambiguous.
   */
  var DIALOGUE = [
    {
      DIALOGUE_ID: "A7_INTRO_01",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "BEAT_1",
      CAPTION_TEXT: "海岬防洪站保護控制室，也保護海岸不被暴雨海水沖進來。",
      VOICE_TEXT: "海岬防洪站保護控制室和海岸。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_01.mp3",
      MEANING_TAG: "place"
    },
    {
      DIALOGUE_ID: "A7_INTRO_02",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "BEAT_2",
      CAPTION_TEXT: "林芮是維修員。她在西側維修隧道檢查西側救援軌道；事故後，她被困在高處避難台。",
      VOICE_TEXT: "林芮是維修員，在西側維修隧道檢查救援軌道，現在在高處避難台。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_02.mp3",
      MEANING_TAG: "lin-rui"
    },
    {
      DIALOGUE_ID: "A7_INTRO_03",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "BEAT_3",
      CAPTION_TEXT: "高承是閘門技師。他在中央隔離閘東側，手上握著手動撐桿。",
      VOICE_TEXT: "高承是閘門技師，在中央隔離閘東側握著手動撐桿。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_03.mp3",
      MEANING_TAG: "gao-cheng"
    },
    {
      DIALOGUE_ID: "A7_INTRO_04",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "BEAT_4",
      CAPTION_TEXT: "管線破裂，電力和主要系統失去作用；海水與污染開始從東側往高承和閘門移動。",
      VOICE_TEXT: "管線破裂，電力和主要系統失效；海水與污染從東側往高承和閘門移動。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_04.mp3",
      MEANING_TAG: "incident"
    },
    {
      DIALOGUE_ID: "A7_INTRO_05",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "BEAT_5",
      CAPTION_TEXT: "控制室無法確認林芮目前的狀態和路線，也無法確認高承和中央隔離閘還能安全多久。",
      VOICE_TEXT: "控制室不知道林芮的狀態和路線，也不知道高承和閘門還能安全多久。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_05.mp3",
      MEANING_TAG: "lost-confirmation"
    },
    {
      DIALOGUE_ID: "A7_INTRO_06",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "BEAT_6",
      CAPTION_TEXT: "這張簡圖把控制室、林芮的高處避難台、高承的手動撐桿、中央隔離閘和西側救援軌道放在一起；海水與污染從東側靠近。",
      VOICE_TEXT: "簡圖標出控制室、兩人的位置、中央隔離閘和西側救援軌道；海水與污染從東側靠近。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_06.mp3",
      MEANING_TAG: "facility-map"
    },
    {
      DIALOGUE_ID: "A7_INTRO_07",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "BEAT_7",
      CAPTION_TEXT: "關上中央隔離閘：20 秒內保護控制室，高承可撤退；救援軌道斷電，林芮的救援車不能通過。再開 95 秒：救援車仍可能帶回林芮；高承必須留在手動撐桿旁，海水與污染持續靠近。",
      VOICE_TEXT: "關上隔離閘能保護控制室，卻讓林芮的救援車不能通過。再開 95 秒保留救援可能，但危險會繼續靠近高承。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_07.mp3",
      MEANING_TAG: "tradeoff"
    },
    {
      DIALOGUE_ID: "A7_INTRO_08",
      STAGE: "INTRO",
      PROFILE: "ALL",
      TRIGGER: "BEAT_8",
      CAPTION_TEXT: "現在由三人組成應變小組：每人拿一支手機、接手一個角色、查一件事；所有發現都能分享，最後一起選擇。",
      VOICE_TEXT: "三人組成應變小組，一人一支手機，查一件事，分享所有發現，最後一起選擇。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_intro_08.mp3",
      MEANING_TAG: "team"
    },
    {
      DIALOGUE_ID: "A7_ROLE_START",
      STAGE: "ROLE",
      PROFILE: "ALL",
      TRIGGER: "ROLE_STARTED",
      CAPTION_TEXT: "你已接手一個角色。先查一件事，再把結果告訴應變小組。",
      VOICE_TEXT: "你已接手一個角色，先查一件事，再告訴應變小組。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_role_start.mp3",
      MEANING_TAG: "role-transition"
    },
    {
      DIALOGUE_ID: "A7_SHARE_PROMPT",
      STAGE: "DISCUSS",
      PROFILE: "ALL",
      TRIGGER: "ALL_FINDINGS_SHARED",
      CAPTION_TEXT: "把查到的和仍不知道的都告訴隊友。接著，應變小組一起決定。",
      VOICE_TEXT: "把查到的和仍不知道的告訴隊友，接著一起決定。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_share_prompt.mp3",
      MEANING_TAG: "share-transition"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BREAKLINE_O1",
      STAGE: "RESULT",
      PROFILE: "BREAKLINE",
      TRIGGER: "DIAGNOSTIC_O1",
      CAPTION_TEXT: "查到：中央隔離閘會在 20 秒內關上。仍不知道：外側救援隊多久能到。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-o1"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BREAKLINE_O2",
      STAGE: "RESULT",
      PROFILE: "BREAKLINE",
      TRIGGER: "DIAGNOSTIC_O2",
      CAPTION_TEXT: "查到：外側救援隊需要 11 分鐘，趕不上西側救援軌道的主要路線。仍不知道：中央隔離閘何時關上。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-o2"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BREAKLINE_R1",
      STAGE: "RESULT",
      PROFILE: "BREAKLINE",
      TRIGGER: "DIAGNOSTIC_R1",
      CAPTION_TEXT: "查到：林芮四秒前還有回應。仍不知道：她現在是否仍在高處避難台，以及西側救援軌道此刻是否能通。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-r1"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BREAKLINE_R2",
      STAGE: "RESULT",
      PROFILE: "BREAKLINE",
      TRIGGER: "DIAGNOSTIC_R2",
      CAPTION_TEXT: "查到：西側救援軌道目前可通，救援車能走過中央隔離閘的開口。仍不知道：林芮現在是否還能回應。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-r2"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BREAKLINE_S1",
      STAGE: "RESULT",
      PROFILE: "BREAKLINE",
      TRIGGER: "DIAGNOSTIC_S1",
      CAPTION_TEXT: "查到：海水與污染約 72 秒到高承那裡。仍不知道：手動撐桿還能撐多久。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-s1"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BREAKLINE_S2",
      STAGE: "RESULT",
      PROFILE: "BREAKLINE",
      TRIGGER: "DIAGNOSTIC_S2",
      CAPTION_TEXT: "查到：手動撐桿撐不過完整的 95 秒。仍不知道：海水與污染何時到高承那裡。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-s2"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BACKWASH_O1",
      STAGE: "RESULT",
      PROFILE: "BACKWASH",
      TRIGGER: "DIAGNOSTIC_O1",
      CAPTION_TEXT: "查到：中央隔離閘會在 20 秒內關上；低速救援車約需 92 秒通過。仍不知道：外側救援隊多久能到。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-o1"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BACKWASH_O2",
      STAGE: "RESULT",
      PROFILE: "BACKWASH",
      TRIGGER: "DIAGNOSTIC_O2",
      CAPTION_TEXT: "查到：外側救援隊需要 4 分鐘，安全空氣約 3 分鐘。仍不知道：中央隔離閘何時關上。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-o2"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BACKWASH_R1",
      STAGE: "RESULT",
      PROFILE: "BACKWASH",
      TRIGGER: "DIAGNOSTIC_R1",
      CAPTION_TEXT: "查到：訊息延遲 41 秒。仍不知道：林芮當下位置和她是否仍有回應。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-r1"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BACKWASH_R2",
      STAGE: "RESULT",
      PROFILE: "BACKWASH",
      TRIGGER: "DIAGNOSTIC_R2",
      CAPTION_TEXT: "查到：西側救援軌道可低速通行，約 92 秒完成。仍不知道：林芮是否還在高處避難台。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-r2"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BACKWASH_S1",
      STAGE: "RESULT",
      PROFILE: "BACKWASH",
      TRIGGER: "DIAGNOSTIC_S1",
      CAPTION_TEXT: "查到：海水與污染約 84 秒到高承那裡；結構壓力在 98 秒後升高。仍不知道：手動撐桿能撐多久。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-s1"
    },
    {
      DIALOGUE_ID: "A7_RESULT_BACKWASH_S2",
      STAGE: "RESULT",
      PROFILE: "BACKWASH",
      TRIGGER: "DIAGNOSTIC_S2",
      CAPTION_TEXT: "查到：手動撐桿還能維持，但呼吸防護密封受損。仍不知道：海水與污染何時到高承那裡。",
      VOICE_TEXT: "",
      AUDIO_FILE: null,
      MEANING_TAG: "diagnostic-s2"
    },
    {
      DIALOGUE_ID: "A7_CONSEQUENCE_BREAKLINE_CLOSE",
      STAGE: "ENDING",
      PROFILE: "BREAKLINE",
      TRIGGER: "DECISION_CLOSE",
      CAPTION_TEXT: "因西側救援軌道失去供電，林芮在外側救援隊約 11 分鐘到達前死亡；高承安全撤出。",
      VOICE_TEXT: "救援軌道失去供電，林芮在外側救援隊約 11 分鐘到達前死亡；高承安全撤出。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_consequence_breakline_close.mp3",
      MEANING_TAG: "consequence-close"
    },
    {
      DIALOGUE_ID: "A7_CONSEQUENCE_BREAKLINE_HOLD",
      STAGE: "ENDING",
      PROFILE: "BREAKLINE",
      TRIGGER: "DECISION_HOLD",
      CAPTION_TEXT: "救援車約 94 秒把林芮救回；手動撐桿損壞後失效，高承死亡。",
      VOICE_TEXT: "救援車約 94 秒救回林芮；手動撐桿損壞後失效，高承死亡。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_consequence_breakline_hold.mp3",
      MEANING_TAG: "consequence-hold"
    },
    {
      DIALOGUE_ID: "A7_CONSEQUENCE_BACKWASH_CLOSE",
      STAGE: "ENDING",
      PROFILE: "BACKWASH",
      TRIGGER: "DECISION_CLOSE",
      CAPTION_TEXT: "外側救援隊改走替代路線，約 4 分鐘救回林芮；缺氧造成永久傷害；高承安全撤出。",
      VOICE_TEXT: "外側救援隊改走替代路線，約 4 分鐘救回林芮；缺氧造成永久傷害；高承安全撤出。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_consequence_backwash_close.mp3",
      MEANING_TAG: "consequence-close"
    },
    {
      DIALOGUE_ID: "A7_CONSEQUENCE_BACKWASH_HOLD",
      STAGE: "ENDING",
      PROFILE: "BACKWASH",
      TRIGGER: "DECISION_HOLD",
      CAPTION_TEXT: "救援車在林芮發生永久傷害前把她救回；高承活下來，但因海水與污染暴露造成永久呼吸傷害。",
      VOICE_TEXT: "救援車在林芮發生永久傷害前把她救回；高承活下來，但海水與污染暴露造成永久呼吸傷害。",
      AUDIO_FILE: "assets/audio/kokoro-zm-010/a7_consequence_backwash_hold.mp3",
      MEANING_TAG: "consequence-hold"
    }
  ];

  global.MOMEY_A7_DIALOGUE = DIALOGUE;
})(window);
