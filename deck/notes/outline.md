# Outline - Datu aizsardzība un kiberdrošība: ikgadējā atkārtošana 2026 (max 20 slaidi, ~60-75 min ar vingrinājumiem)

Auditorija: visi Mitigate darbinieki (~40) kopsapulcē. Mērķis: pēc sesijas katrs zina 3 lietas, ko dara citādi, un kur ziņot. Pierādījums ISO 27001 A.6.3 + risku plāna pasākums (Jana).
Vadītāji: Jana (ievads, VDAR daļa kopā ar Jūliju), Edgars (kiberdrošība + MI rīki). Valoda: LV.
Faktu avoti: reports/GDPR un kiberdrošības apmācības 2026.md (pētījums 18.10.2026) - skaitļi tikai no turienes, ar avota rindu.

| # | Slaids (virsraksts kā apgalvojums) | Pattern | Vizuālis / vingrinājums | Avots |
|---|---|---|---|---|
| 1 | Vāks: "Viena kļūda, viens klikšķis - ko darām citādi 2026" | cover | motīvs | - |
| 2 | Kāpēc atkal: cilvēks ir pirmais mērķis, ne serveris | big numbers | 2-3 skaitļi (cilvēka faktors pārkāpumos, pikšķerēšanas klikšķu %) | DBIR/ENISA |
| 3 | Šogad Latvijā: ko CERT.LV redz visbiežāk | rows 3-4 | CERT.LV 2025-2026 incidentu tipi | CERT.LV |
| 4 | Vingrinājums 1: īsts vai viltus? (3 e-pasti/ziņas) | reveal | Mentimeter/rokas; atbilde pēc klikšķa | - |
| 5 | Pikšķerēšana 2026 izskatās kā kolēģa ziņa | diagram | ķēde: ziņa → OAuth piekrišana / sesijas sīkdatne → konts, MFA apiets | pētījums |
| 6 | Deepfake: balss vairs nav pierādījums | statement + stāsts | Arup 25,6 M / Ferrari atsaukuma jautājums | pētījums |
| 7 | Noteikums: zvani atpakaļ pa zināmu numuru | rows 3 | kā pārbaudīt (naudas/paroles/pieejas pieprasījumi) | MIT-01-AP |
| 8 | Izstrādātājiem: piegādes ķēde uzbrūk caur npm un GitHub Actions | rows 3 | Shai-Hulud / tj-actions / noslēpumi repo | pētījums |
| 9 | Paroles: pārvaldnieks + 2FA, labāk passkey | meters/rows | MIT-01-AP prasības (12 simboli, 2FA obligāts, Bitwarden) | MIT-01-AP |
| 10 | Dalītājs: Personas dati | divider (dark) | - | - |
| 11 | Personas dati ir arī Jira ekrānuzņēmumā un logos | rows 4 | tipiskās kļūdas izstrādes uzņēmumā (testa dati no prod, privāts e-pasts, ekrānuzņēmumi, glabāšana) | pētījums + MIT-01-AP |
| 12 | Vingrinājums 2: atrodi pārkāpumu (3 situācijas) | reveal | klienta e-pasts ar CSV; Slack ekrānuzņēmums; vecs projekts Drive | - |
| 13 | DVI un ES sodi: stāsti, kas paliek atmiņā | quote/rows | 1 LV + 1 ES piemērs 2025-2026 | DVI / tracker |
| 14 | Kas jauns 2025-2026 VDAR pasaulē (īsi) | rows 3 | EDPB MI modeļi, Data Act, omnibus statuss | EDPB |
| 15 | Dalītājs: MI rīki | divider (dark) | - | - |
| 16 | MI rīks ir ārpakalpojums: kas tajā drīkst nonākt | table | drīkst / nedrīkst (klientu personas dati, noslēpumi, kods); apstiprinātie rīki | pētījums + MIT-01-AP |
| 17 | Prompt injection: aģents izpilda svešas instrukcijas | diagram + stāsts | EchoLeak / GitHub MCP; vingrinājums 3: Gandalf 2 min | pētījums |
| 18 | AI Act mums: 50. pants, marķējums klientiem (02.12.2026 robs) | rows 3 | AI literacy (4. p.), marķējums, ko darām platformā | AI Act / memory |
| 19 | Ja kaut kas noticis: ziņo 1 stundas laikā, nevis klusē | diagram | security@ → CTO → 24 h CERT/klients → 72 h DVI; BCP krīzes kanāls | MIT-01-AP, MIT-04 |
| 20 | Noslēgums (dark): 3 solījumi + kur ziņot | closing | katrs pieraksta 3 lietas; quiz saite | - |

Rezerve, ja jāsaīsina līdz 60 min: izlaist 14 un 18 (atstāt piezīmēs).
