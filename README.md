# PandaUI 2.0.0

Osobní deník s přehledy spotřeby a nákladů, upravený pro iPhone.

Přehled a Statistiky obsahují přidatelné, skrývatelné a přesouvatelné widgety. Jejich nabídky umožňují nastavit obsah a kompaktní zobrazení. Osobní profil uchovává zadanou váhu a volitelné subjektivní hodnocení tolerance; nevypočítává doporučené dávkování. Váha u nových záznamů je samostatný uložený údaj a nemění staré dávky.

Produkční soubory: `index.html`, `assets/app.css`, `assets/widgets.css`, `assets/ios.css`, `assets/core.js`, `assets/widgets.js`, manifest, ikony a `sw.js`. Náhledy a `assets/preview-data.js` se nezveřejňují. Produkce zachovává úložiště `kratom-denik-v1` a IndexedDB `bp`.

Na GitHub Pages publikujte kořen této složky. Po prvním načtení online se soubory aplikace uloží pro offline použití. Připravenost je uvedena dole v Nastavení. Při aktualizaci souboru sw.js změňte označení CACHE.

Dávky jsou uložené pouze v zařízení (localStorage a IndexedDB), nikoli na GitHubu. Před aktualizací doporučujeme export zálohy v Nastavení. Zachovávejte stejnou adresu aplikace i klíče úložiště.

Od verze 1.3.0 obsahuje samostatný deník nákupů: celkové nakoupené gramy, cena, počet balení a historie. Nákupy nijak nemění dávky, jejich ceny ani spotřebu. Nejde o sklad ani skutečnou objednávku. Historie dávek je přístupná z Přehledu.
