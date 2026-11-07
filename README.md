# PandaUI 2.1.0

Všechny karty Přehledu a Statistik lze přesunout mezi oběma stránkami pomocí nabídky •••. Nastavení i pořadí se ukládají. Dnešek v číslech nabízí porovnání se stejným dnem minulého týdne do stejného času, včetně gramů, počtu záznamů a nákladů.

Osobní profil ukazuje číselný trend spotřeby (dva poslední celé týdny) a po změně o 25 % nebo 50 % může nabídnout přehodnocení vlastní tolerance. Upozornění lze vypnout a zobrazí se nejvýše jednou týdně. Vyžaduje alespoň 14 dní historie a 3 dny se záznamem v každém týdnu. Skutečná tolerance ani doporučené skóre 1–10 se z gramů nebo váhy neodvozují; číslo zůstává vlastním hodnocením uživatele.

Osobní deník s přehledy spotřeby a nákladů, upravený pro iPhone.

Přehled a Statistiky obsahují přidatelné, skrývatelné a přesouvatelné widgety. Jejich nabídky umožňují nastavit obsah a kompaktní zobrazení. Osobní profil uchovává zadanou váhu a volitelné subjektivní hodnocení tolerance; nevypočítává doporučené dávkování. Váha u nových záznamů je samostatný uložený údaj a nemění staré dávky.

Produkční soubory: `index.html`, `assets/app.css`, `assets/widgets.css`, `assets/ios.css`, `assets/core.js`, `assets/widgets.js`, manifest, ikony a `sw.js`. Náhledy a `assets/preview-data.js` se nezveřejňují. Produkce zachovává úložiště `kratom-denik-v1` a IndexedDB `bp`.

Na GitHub Pages publikujte kořen této složky. Po prvním načtení online se soubory aplikace uloží pro offline použití. Připravenost je uvedena dole v Nastavení. Při aktualizaci souboru sw.js změňte označení CACHE.

Dávky jsou uložené pouze v zařízení (localStorage a IndexedDB), nikoli na GitHubu. Před aktualizací doporučujeme export zálohy v Nastavení. Zachovávejte stejnou adresu aplikace i klíče úložiště.

Od verze 1.3.0 obsahuje samostatný deník nákupů: celkové nakoupené gramy, cena, počet balení a historie. Nákupy nijak nemění dávky, jejich ceny ani spotřebu. Nejde o sklad ani skutečnou objednávku. Historie dávek je přístupná z Přehledu.
