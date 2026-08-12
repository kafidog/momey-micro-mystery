# Preset Dialogue Table

Every runtime operator line is authored in `assets/app.js`. `VOICE=true` means the visible caption may also be spoken when shared audio is enabled. There is no generated text.

| DIALOGUE_ID | STAGE | AUDIENCE | PROFILE | TRIGGER | TEXT | VOICE | SFX | KNOWLEDGE_SOURCE | FOLLOWUP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OP_INDEX | ENTRY | ALL | ALL | session-created | 事件鏈路已建立。三位人類應變員，請各自接手一項角色。 | true | start | session seed and role links | open one distinct role link per device |
| OP_BOOT | ROLE | ALL | ALL | role-opened | 岬衛-7 上線。我只回報已接通的資料；決定由你們做。 | true | start | operator protocol | read role responsibility |
| OP_PLAN | PLAN | ALL | ALL | planning-confirmed | 六個未知只能查三個。先說好每個人要留下哪一個空白。 | true | signal | diagnostic resource state | each role drafts one diagnostic |
| OP_SHARE | SHARE | ALL | ALL | diagnostic-complete | 把查到的和仍不知道的都說出來。不要只報結論。 | true | signal | completed diagnostic result | share all relevant facts |
| OP_ESCALATE | DECISION | ALL | ALL | sharing-complete | 事件窗口正在收束。請用仍然不完整的資料，形成共同決定。 | true | escalation | incident clock | draft and say one shared action |
| OP_AGREED | DECISION | ALL | ALL | agreement-spoken | 共同選項已覆述。確認前仍可改；確認後立即執行。 | true | decision | local confirmation state | confirm or revise |
| BL_O1 | DIAGNOSTIC | ROLE_1 | breakline | O1-confirmed | 時序鏈回報：封閉二十秒，撤離九十五秒；兩者互斥。 | true | diagnostic | backup procedure clock | share result and boundary |
| BL_O2 | DIAGNOSTIC | ROLE_1 | breakline | O2-confirmed | 備援程序回報：替代進入十一分鐘，晚於西側窗口。 | true | diagnostic | backup access log | share result and boundary |
| BL_R1 | DIAGNOSTIC | ROLE_2 | breakline | R1-confirmed | 訊號回報：四秒前直接寫入，有人主動操作。 | true | signal | wearable packet clock | share result and boundary |
| BL_R2 | DIAGNOSTIC | ROLE_2 | breakline | R2-confirmed | 西側回波：高位避難龕有定位；推車軌可通。 | true | diagnostic | west echo scanner | share result and boundary |
| BL_S1 | DIAGNOSTIC | ROLE_3 | breakline | S1-confirmed | 東閘投影：前緣七十二秒抵達，八十三秒通過峰值。 | true | escalation | east pressure line | share result and boundary |
| BL_S2 | DIAGNOSTIC | ROLE_3 | breakline | S2-confirmed | 撐架回報：裂損模型無法承受完整救援窗口。 | true | diagnostic | brace load model | share result and boundary |
| BW_O1 | DIAGNOSTIC | ROLE_1 | backwash | O1-confirmed | 時序鏈回報：封閉二十秒，低速撤離九十二秒；兩者互斥。 | true | diagnostic | backup procedure clock | share result and boundary |
| BW_O2 | DIAGNOSTIC | ROLE_1 | backwash | O2-confirmed | 備援程序回報：替代進入四分鐘；安全空氣約三分鐘。 | true | diagnostic | backup access and shelter sensor | share result and boundary |
| BW_R1 | DIAGNOSTIC | ROLE_2 | backwash | R1-confirmed | 訊號回報：封包延遲四十一秒，無法證明當下位置。 | true | signal | wearable buffer metadata | share result and boundary |
| BW_R2 | DIAGNOSTIC | ROLE_2 | backwash | R2-confirmed | 西側回波：低速路徑可通，九十二秒完成撤離。 | true | diagnostic | west route scanner | share result and boundary |
| BW_S1 | DIAGNOSTIC | ROLE_3 | backwash | S1-confirmed | 東閘投影：污染八十四秒抵達；結構峰值在九十八秒後。 | true | escalation | east pressure and aerosol line | share result and boundary |
| BW_S2 | DIAGNOSTIC | ROLE_3 | backwash | S2-confirmed | 工作站回報：撐架可維持；呼吸防護密封受損。 | true | diagnostic | brace model and station seal sensor | share result and boundary |
| BL_CLOSE | CONSEQUENCE | ALL | breakline | close-confirmed | 封閉完成。高承已撤出；西側替代進入未趕上林芮的窗口。 | true | consequence | fixed breakline timeline | show structured outcome |
| BL_HOLD | CONSEQUENCE | ALL | breakline | hold-confirmed | 救援完成。林芮已撤出；東閘撐架在隔離完成後失效。 | true | consequence | fixed breakline timeline | show structured outcome |
| BW_CLOSE | CONSEQUENCE | ALL | backwash | close-confirmed | 封閉完成。高承已撤出；林芮由替代小組救出。 | true | consequence | fixed backwash timeline | show structured outcome |
| BW_HOLD | CONSEQUENCE | ALL | backwash | hold-confirmed | 救援完成。兩人存活；高承的暴露造成永久傷害。 | true | consequence | fixed backwash timeline | show structured outcome |

Runtime contract tests verify unique IDs, all ten required fields, and non-empty text for every row.
